const {test}=require('node:test');const assert=require('node:assert/strict');const {createApp}=require('../backend/app.cjs');const {openDatabase}=require('../backend/database.cjs');
test('accounts, authorization, seat locking, pricing, sandbox payments and consent',async t=>{
 const db=openDatabase(':memory:');const server=createApp({db});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;
 function client(){let cookie='',csrf='';return async(path,{method='GET',body,token=true}={})=>{const r=await fetch(base+path,{method,headers:{Cookie:cookie,...(body?{'Content-Type':'application/json',...(token?{'X-CSRF-Token':csrf}:{})}:{})},...(body?{body:JSON.stringify(body)}:{})});const set=r.headers.get('set-cookie');if(set?.startsWith('orbit_session='))cookie=set.split(';')[0];const d=await r.json();if(d.csrf)csrf=d.csrf;return {r,d,cookie}}}
 const a=client(),b=client();let x=await a('/api/session');assert.equal(x.r.status,200);assert.match(x.r.headers.get('set-cookie'),/HttpOnly/);assert.match(x.r.headers.get('set-cookie'),/SameSite=Strict/);assert.equal(x.d.user,null);
 x=await a('/api/auth/register',{method:'POST',body:{name:'Cinema Tester',email:'cinema@example.com',password:'a-test-password-42'}});assert.equal(x.r.status,200);assert.equal(x.d.user.email,'cinema@example.com');assert.ok(!JSON.stringify(x.d).includes('password_hash'));
 const hash=db.prepare('SELECT password_hash FROM users').get().password_hash;assert.notEqual(hash,'a-test-password-42');assert.match(hash,/:/);
 x=await a('/api/account',{method:'PATCH',body:{name:'No CSRF'},token:false});assert.equal(x.r.status,403);
 await b('/api/session');x=await b('/api/orders');assert.equal(x.r.status,401);
 await b('/api/auth/register',{method:'POST',body:{name:'Other Viewer',email:'other@example.com',password:'another-password-42'}});
 const date=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});const draft={kind:'movie',itemId:2,venueId:1,date,time:'7:30 PM',seats:['C5'],total:1};
 x=await a('/api/orders',{method:'POST',body:draft});assert.equal(x.r.status,201);assert.equal(x.d.order.subtotal,30000);assert.equal(x.d.order.fee,900);assert.equal(x.d.order.total,30900);const id=x.d.order.id;
 x=await b('/api/orders/'+id);assert.equal(x.r.status,404);
 x=await b('/api/orders',{method:'POST',body:draft});assert.equal(x.r.status,409);
 x=await a('/api/orders/'+id+'/pay',{method:'POST',body:{method:'real-card'}});assert.equal(x.r.status,400);
 x=await a('/api/orders/'+id+'/pay',{method:'POST',body:{method:'demo-card',outcome:'success'}});assert.equal(x.r.status,200);assert.equal(x.d.order.status,'confirmed');assert.equal(x.d.order.payment.status,'simulated');const pid=x.d.order.payment.id;
 x=await a('/api/orders/'+id+'/pay',{method:'POST',body:{method:'demo-upi',outcome:'success'}});assert.equal(x.d.order.payment.id,pid);assert.equal(db.prepare('SELECT COUNT(*) n FROM payments').get().n,1);
 x=await a('/api/orders',{method:'POST',body:{...draft,seats:['A4']}});assert.equal(x.r.status,409);
 x=await a('/api/orders',{method:'POST',body:{...draft,seats:['C6']}});const failed=x.d.order.id;x=await a('/api/orders/'+failed+'/pay',{method:'POST',body:{method:'demo-wallet',outcome:'decline'}});assert.equal(x.d.order.status,'failed');assert.equal(db.prepare('SELECT COUNT(*) n FROM reservations WHERE order_id=?').get(failed).n,0);
 x=await a('/api/orders',{method:'POST',body:{...draft,seats:['C7']}});const expired=x.d.order.id;db.prepare('UPDATE reservations SET expires=0 WHERE order_id=?').run(expired);x=await a('/api/orders/'+expired+'/pay',{method:'POST',body:{method:'demo-upi'}});assert.equal(x.r.status,409);
 x=await a('/api/orders',{method:'POST',body:{kind:'event',itemId:0,quantity:2}});assert.equal(x.r.status,201);assert.equal(x.d.order.subtotal,159800);
 x=await a('/api/consent',{method:'POST',body:{preferences:false}});assert.equal(x.d.essential,true);assert.equal(x.d.analytics,false);assert.match(x.r.headers.get('set-cookie'),/orbit_consent=essential/);
 x=await a('/api/orders');assert.ok(x.d.orders.length>=4);
 x=await a('/api/auth/logout',{method:'POST',body:{}});assert.equal(x.d.user,null);x=await a('/api/orders');assert.equal(x.r.status,401);
 x=await a('/api/auth/login',{method:'POST',body:{email:'cinema@example.com',password:'a-test-password-42'}});assert.equal(x.r.status,200);
 const sensitive=await fetch(base+'/.env');assert.equal(sensitive.status,404);const data=await fetch(base+'/../data/orbit.sqlite');assert.equal(data.status,404);
});
