const {test}=require('node:test');const assert=require('node:assert/strict');
const {mkdtempSync,rmSync}=require('node:fs');const {tmpdir}=require('node:os');const {join}=require('node:path');
const {openDatabase}=require('../backend/database.cjs');const {createApp}=require('../backend/app.cjs');
const {createRateLimiter,createWorkGate,POLICIES,peer}=require('../backend/rate-limit.cjs');

test('token buckets block bursts, refill gradually, isolate subjects and survive reopening',()=>{
 const folder=mkdtempSync(join(tmpdir(),'echo-rates-'));let db;try{
  let at=100000;const options={now:()=>at,policies:{test:{limit:4,windowMs:60000,burst:2}}};db=openDatabase(join(folder,'rates.sqlite'));let limiter=createRateLimiter(db,options);
  limiter.consume('test','one');limiter.consume('test','one');
  assert.throws(()=>limiter.consume('test','one'),e=>e.status===429&&e.retryAfter===15);
  limiter.consume('test','two');db.close();db=openDatabase(join(folder,'rates.sqlite'));limiter=createRateLimiter(db,options);
  assert.throws(()=>limiter.consume('test','one'),e=>e.status===429);
  at+=14999;assert.throws(()=>limiter.consume('test','one'),e=>e.status===429&&e.retryAfter===1);
  at++;limiter.consume('test','one');assert.throws(()=>limiter.consume('test','one'),e=>e.status===429);
  // A clock rollback must not refill the bucket.
  at-=10000;assert.throws(()=>limiter.consume('test','one'),e=>e.status===429);
  assert.ok(!JSON.stringify(db.prepare('SELECT key FROM rate_buckets').all()).includes('one'));
 }finally{db?.close();rmSync(folder,{recursive:true,force:true})}
});

test('bucket capacity fails closed, while expired buckets can be reclaimed',()=>{
 const db=openDatabase(':memory:');try{let at=1000;const l=createRateLimiter(db,{now:()=>at,maxBuckets:2,policies:{test:{limit:1,windowMs:1000}}});l.consume('test','a');l.consume('test','b');assert.throws(()=>l.consume('test','c'),e=>e.status===429);assert.equal(db.prepare('SELECT COUNT(*) n FROM rate_buckets').get().n,2);at+=1000;l.consume('test','c');assert.equal(db.prepare('SELECT COUNT(*) n FROM rate_buckets').get().n,1)}finally{db.close()}
});

test('work gates cap concurrent work and release slots after success or failure',async()=>{
 const gate=createWorkGate(1);let release;const first=gate(()=>new Promise(resolve=>release=resolve));await assert.rejects(gate(()=>42),e=>e.status===429&&e.retryAfter===2);release();await first;await assert.rejects(gate(()=>{throw Error('service failure')}),/service failure/);assert.equal(await gate(()=>42),42);
});

async function fixture(t,overrides){
 const db=openDatabase(':memory:');const server=createApp({db,rateOptions:{policies:{...POLICIES,...overrides}},chat:async()=> 'A test recommendation.'});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));const base='http://127.0.0.1:'+server.address().port;
 function client(){let cookie='',csrf='';return async(route,{body,method=body?'POST':'GET',headers={}}={})=>{const r=await fetch(base+route,{method,headers:{Cookie:cookie,...(body?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});const set=r.headers.get('set-cookie');if(set?.startsWith('orbit_session='))cookie=set.split(';')[0];const d=await r.json();if(d.csrf)csrf=d.csrf;return {r,d}}}
 return {client,db,base};
}
const tiny={limit:2,windowMs:60000,burst:2};

test('HTTP limits expose retry headers and cannot be bypassed by forged proxy headers',async t=>{
 const {base,db}=await fixture(t,{session:tiny});
 for(let i=0;i<2;i++)assert.equal((await fetch(base+'/api/session',{headers:{'X-Forwarded-For':'203.0.113.'+i}})).status,200);
 const denied=await fetch(base+'/api/session',{headers:{'X-Forwarded-For':'198.51.100.1',Forwarded:'for=198.51.100.1','X-Real-IP':'198.51.100.1'}});
 assert.equal(denied.status,429);assert.equal(denied.headers.get('Retry-After'),'30');assert.equal(denied.headers.get('RateLimit-Remaining'),'0');assert.equal(denied.headers.get('Cache-Control'),'no-store');assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions').get().n,2);
 assert.equal(peer({socket:{remoteAddress:'::ffff:127.0.0.1'},headers:{'x-forwarded-for':'fake'}}),'127.0.0.1');
});

test('login email limits persist across sessions and normalise email case',async t=>{
 const {client}=await fixture(t,{authEmail:tiny});const a=client(),b=client();await a('/api/session');await b('/api/session');
 assert.equal((await a('/api/auth/login',{body:{email:'Viewer@example.com',password:'incorrect-password'}})).r.status,401);
 assert.equal((await b('/api/auth/login',{body:{email:' viewer@EXAMPLE.com ',password:'incorrect-password'}})).r.status,401);
 const blocked=await a('/api/auth/login',{body:{email:'viewer@example.com',password:'incorrect-password'}});assert.equal(blocked.r.status,429);assert.equal(blocked.r.headers.get('Retry-After'),'30');
 assert.equal((await a('/api/auth/login',{body:{email:'other@example.com',password:'incorrect-password'}})).r.status,401);
});

test('registration is blocked before expensive work or extra account creation',async t=>{
 const {client,db}=await fixture(t,{register:{limit:1,windowMs:3600000}});const a=client();await a('/api/session');
 assert.equal((await a('/api/auth/register',{body:{name:'Tester One',email:'one@example.com',password:'a-valid-password-42'}})).r.status,200);
 const blocked=await a('/api/auth/register',{body:{name:'Tester Two',email:'two@example.com',password:'a-valid-password-42'}});assert.equal(blocked.r.status,429);assert.equal(db.prepare('SELECT COUNT(*) n FROM users').get().n,1);
});

test('AI limits apply across guest sessions and its global budget cannot be reset by logging in',async t=>{
 const {client}=await fixture(t,{aiBudget:tiny});const a=client(),b=client();await a('/api/session');await b('/api/session');
 assert.equal((await a('/api/ai/chat',{body:{message:'Pick a movie'}})).r.status,200);
 assert.equal((await b('/api/ai/chat',{body:{message:'Pick another movie'}})).r.status,200);
 assert.equal((await a('/api/auth/register',{body:{name:'AI Viewer',email:'ai@example.com',password:'a-valid-password-42'}})).r.status,200);
 const blocked=await a('/api/ai/chat',{body:{message:'Pick a movie'}});assert.equal(blocked.r.status,429);assert.equal(blocked.r.headers.get('Retry-After'),'30');
});

test('order and payment limits prevent further writes and retain payment idempotency',async t=>{
 const {client,db}=await fixture(t,{ordersUser:tiny,paymentUser:tiny});const a=client();await a('/api/session');await a('/api/auth/register',{body:{name:'Order Viewer',email:'orders@example.com',password:'a-valid-password-42'}});
 const first=await a('/api/orders',{body:{kind:'event',itemId:0,quantity:1}});assert.equal(first.r.status,201);assert.equal((await a('/api/orders',{body:{kind:'event',itemId:1,quantity:1}})).r.status,201);
 assert.equal((await a('/api/orders',{body:{kind:'event',itemId:2,quantity:1}})).r.status,429);assert.equal(db.prepare('SELECT COUNT(*) n FROM orders').get().n,2);
 const route='/api/orders/'+first.d.order.id+'/pay';assert.equal((await a(route,{body:{method:'demo-card',outcome:'success'}})).r.status,200);assert.equal((await a(route,{body:{method:'demo-card',outcome:'success'}})).r.status,200);
 assert.equal((await a(route,{body:{method:'demo-card',outcome:'success'}})).r.status,429);assert.equal(db.prepare('SELECT COUNT(*) n FROM payments').get().n,1);
});

test('global API and static traffic policies reject excess requests',async t=>{
 const {base}=await fixture(t,{api:tiny,traffic:{limit:4,windowMs:60000,burst:4}});assert.equal((await fetch(base+'/api/session')).status,200);assert.equal((await fetch(base+'/api/session')).status,200);assert.equal((await fetch(base+'/api/session')).status,429);assert.equal((await fetch(base+'/index.html')).status,200);const denied=await fetch(base+'/index.html');assert.equal(denied.status,429);assert.ok(Number(denied.headers.get('Retry-After'))>0);
});
