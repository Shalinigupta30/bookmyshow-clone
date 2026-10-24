const crypto=require('node:crypto');const {promisify}=require('node:util');const scrypt=promisify(crypto.scrypt);
const random=()=>crypto.randomBytes(32).toString('hex');const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
async function hashPassword(password){const salt=crypto.randomBytes(16).toString('hex');const key=await scrypt(password,salt,64);return salt+':'+key.toString('hex')}
async function checkPassword(password,stored){const [salt,hash]=stored.split(':');const actual=await scrypt(password,salt,64);const expected=Buffer.from(hash,'hex');return expected.length===actual.length&&crypto.timingSafeEqual(expected,actual)}
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(p=>{const i=p.indexOf('=');return i<0?['','']:[p.slice(0,i).trim(),p.slice(i+1).trim()]}))}
function session(db,req,res,{rotate=false,userId=null,beforeCreate}={}){const token=cookies(req).orbit_session;let row=token&&!rotate?db.prepare('SELECT * FROM sessions WHERE token_hash=? AND expires>?').get(digest(token),Date.now()):null;
 if(!row){beforeCreate?.();if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());const fresh=random();row={token_hash:digest(fresh),user_id:userId,csrf:random(),expires:Date.now()+7*86400000};db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(row.token_hash,row.user_id,row.csrf,row.expires);res.setHeader('Set-Cookie',`orbit_session=${fresh}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${req.socket.encrypted?'; Secure':''}`)}return row}
function publicUser(db,id){return id?db.prepare('SELECT id,name,email,city,created_at FROM users WHERE id=?').get(id)||null:null}
class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
module.exports={random,digest,hashPassword,checkPassword,cookies,session,publicUser,HttpError};
