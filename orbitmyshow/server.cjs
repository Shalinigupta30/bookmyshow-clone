require('./backend/config.cjs');
const {createApp}=require('./backend/app.cjs');
const server=createApp();
server.listen(Number(process.env.PORT)||5173,process.env.HOST||'127.0.0.1',()=>console.log(`EchoMyShow · Local: http://localhost:${Number(process.env.PORT)||5173} · API & SQLite ready`));
server.on('error',err=>{console.error(err.code==='EADDRINUSE'?'Port already in use. Stop the previous EchoMyShow server first.':err.message);process.exitCode=1});
