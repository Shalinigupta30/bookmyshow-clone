const {createHash}=require('node:crypto');
const {HttpError}=require('./security.cjs');

// Token buckets are shared by processes using this database and survive restarts.
// The peer address comes from the socket, never from client-supplied proxy headers.
const POLICIES={
 traffic:{limit:600,windowMs:60000,burst:180},
 api:{limit:180,windowMs:60000,burst:60},
 session:{limit:30,windowMs:60000,burst:15},
 authIp:{limit:20,windowMs:900000,burst:20},
 authEmail:{limit:8,windowMs:900000,burst:8},
 register:{limit:5,windowMs:3600000,burst:5},
 account:{limit:12,windowMs:60000,burst:6},
 aiIp:{limit:8,windowMs:60000,burst:4},
 aiUser:{limit:8,windowMs:60000,burst:4},
 aiBudget:{limit:100,windowMs:3600000,burst:20},
 ordersIp:{limit:30,windowMs:60000,burst:15},
 ordersUser:{limit:12,windowMs:60000,burst:8},
 paymentIp:{limit:20,windowMs:60000,burst:10},
 paymentUser:{limit:10,windowMs:60000,burst:6},
 consent:{limit:12,windowMs:60000,burst:6}
};
const identity=value=>createHash('sha256').update(String(value)).digest('hex');
const peer=req=>(req.socket.remoteAddress||'unknown').replace(/^::ffff:/,'');

function createRateLimiter(db,{now=Date.now,policies=POLICIES,maxBuckets=10000}={}){
 db.exec('CREATE TABLE IF NOT EXISTS rate_buckets(key TEXT PRIMARY KEY,tokens REAL NOT NULL,updated INTEGER NOT NULL,expires INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS rate_expiry ON rate_buckets(expires)');
 const read=db.prepare('SELECT tokens,updated FROM rate_buckets WHERE key=?');
 const write=db.prepare('INSERT INTO rate_buckets VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET tokens=excluded.tokens,updated=excluded.updated,expires=excluded.expires');
 const cleanup=db.prepare('DELETE FROM rate_buckets WHERE expires<=?');
 const size=db.prepare('SELECT COUNT(*) AS n FROM rate_buckets');
 function consume(scope,subject,res){
  const p=policies[scope];if(!p)throw Error('Unknown rate policy');
  const at=now(),capacity=p.burst||p.limit,interval=p.windowMs/p.limit;
  const key=scope+':'+identity(subject);let state;
  db.exec('BEGIN IMMEDIATE');
  try{
   const existing=read.get(key);let tokens=existing?Math.min(capacity,existing.tokens+Math.max(0,at-existing.updated)/interval):capacity;
   if(!existing){cleanup.run(at);if(size.get().n>=maxBuckets){const e=new HttpError(429,'Server request capacity reached. Please retry shortly.');e.retryAfter=60;throw e}}
   if(tokens<1){state={allowed:false,remaining:0,retryAfter:Math.max(1,Math.ceil((1-tokens)*interval/1000)),capacity};}
   else{tokens-=1;const updated=Math.max(at,existing?.updated||0);write.run(key,tokens,updated,updated+p.windowMs);state={allowed:true,remaining:Math.floor(tokens),capacity,retryAfter:Math.max(1,Math.ceil((capacity-tokens)*interval/1000))};}
   db.exec('COMMIT');
  }catch(err){db.exec('ROLLBACK');throw err}
  if(res){res.setHeader('RateLimit-Limit',String(state.capacity));res.setHeader('RateLimit-Remaining',String(state.remaining));res.setHeader('RateLimit-Reset',String(state.retryAfter));}
  if(!state.allowed){const err=new HttpError(429,'Too many requests. Please wait before trying again.');err.retryAfter=state.retryAfter;throw err}
  return state;
 }
 return {consume};
}

// Cap concurrent expensive work as well as request frequency. Always release in finally.
function createWorkGate(capacity){let active=0;return async function run(work){if(active>=capacity){const e=new HttpError(429,'The service is busy. Please try again in a moment.');e.retryAfter=2;throw e}active++;try{return await work()}finally{active--}}}
module.exports={POLICIES,createRateLimiter,createWorkGate,peer,identity};
