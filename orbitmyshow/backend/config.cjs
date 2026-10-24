const fs=require('node:fs'),path=require('node:path');
const file=path.resolve(__dirname,'../.env');
if(fs.existsSync(file))for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim()}
