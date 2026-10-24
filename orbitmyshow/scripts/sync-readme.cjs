const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let content=fs.readFileSync(path.join(root,'README.md'),'utf8');
const outer=path.resolve(root,'..');
fs.mkdirSync(path.join(outer,'docs/assets'),{recursive:true});
for(const asset of fs.readdirSync(path.join(root,'docs/assets')))fs.copyFileSync(path.join(root,'docs/assets',asset),path.join(outer,'docs/assets',asset));
content=content.replace(/\]\((?!https?:|#)([^)]+)\)/g,(_,target)=>']('+(target.startsWith('docs/assets/')?target:'orbitmyshow/'+target)+')')
 .replace('Run these commands from the application directory:','From this repository root, enter the application directory first:')
 .replace('npm install\nnpm start','cd orbitmyshow\nnpm install\nnpm start');
fs.writeFileSync(path.resolve(root,'../README.md'),content);
for(const file of [path.join(root,'README.md'),path.resolve(root,'../README.md')]){
 const text=fs.readFileSync(file,'utf8');const links=[...text.matchAll(/\]\((?!https?:|#)([^)]+)\)|src="([^"]+)"/g)];
 for(const link of links){const target=link[1]||link[2];if(!fs.existsSync(path.resolve(path.dirname(file),target)))throw Error('Missing README asset: '+target)}
 console.log(path.basename(path.dirname(file))+': '+links.length+' local links verified.');
}
