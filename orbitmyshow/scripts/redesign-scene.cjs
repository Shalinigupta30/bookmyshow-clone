const fs=require('node:fs');const file='dist/scene.js';let s=fs.readFileSync(file,'utf8');const start=s.indexOf(' }else{\n  const sphere');const end=s.indexOf('\n const pointer=',start);if(start<0||end<0)throw Error('Scene replacement boundaries not found');
s=s.slice(0,start)+` }else{
  const loader=new THREE.TextureLoader();
  const entries=[['assets/films/dark-knight.jpg',4,-2.65,-.08,-1.4,-.25],['assets/films/oppenheimer.jpg',6,-1.36,.2,-.6,-.13],['assets/films/interstellar.jpg',2,.2,.05,.5,.04],['assets/films/dark-knight.jpg',4,1.7,-.12,-.45,.17],['assets/films/oppenheimer.jpg',6,2.9,.08,-1.5,.28]];
  entries.forEach(([src,id,x,y,z,rz],i)=>{
   const tex=loader.load(src);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);textures.push(tex);
   const card=new THREE.Group();const edge=material({color:0x22201c,metalness:.35,roughness:.5});const board=new THREE.Mesh(new THREE.BoxGeometry(2.14,3.22,.14),edge);geometries.push(board.geometry);card.add(board);
   const imageMaterial=new THREE.MeshBasicMaterial({map:tex});materials.push(imageMaterial);const front=new THREE.Mesh(new THREE.PlaneGeometry(2.04,3.12),imageMaterial);front.position.z=.076;card.add(front);geometries.push(front.geometry);
   const back=new THREE.Mesh(new THREE.PlaneGeometry(2.04,3.12),material({color:0x38312a,roughness:.5}));back.position.z=-.076;back.rotation.y=Math.PI;card.add(back);geometries.push(back.geometry);
   card.position.set(x,y,z);card.rotation.set(-.03,x*.1,rz);card.userData.href='movie.html?id='+id;group.add(card);floaters.push({obj:card,base:card.position.clone(),phase:i*1.3});
  });
  const base=mesh(new THREE.CylinderGeometry(3.6,3.75,.08,96),material({color:0x24221f,metalness:.45,roughness:.6}));base.position.set(0,-1.82,-.5);base.scale.z=.48;
 }
`+s.slice(end);
s=s.replace("else if(moving){group.rotation.y+=(px*.25-group.rotation.y)*.03;group.rotation.x+=(-py*.12-group.rotation.x)*.03;for(const f of floaters){f.obj.position.y=f.base.y+Math.sin(t*.7+f.phase)*.13;f.obj.rotation.z+=Math.sin(t*.25+f.phase)*.0006}}", "else if(moving){const r=host.getBoundingClientRect();const scroll=Math.max(-1,Math.min(1,(innerHeight*.4-r.top-r.height*.4)/innerHeight));group.rotation.y+=(px*.3+scroll*.12-group.rotation.y)*.035;group.rotation.x+=(-py*.1+scroll*.05-group.rotation.x)*.035;group.position.y+=(-scroll*.3-group.position.y)*.04;for(const f of floaters){f.obj.position.y=f.base.y+Math.sin(t*.5+f.phase)*.045;f.obj.rotation.z+=Math.sin(t*.2+f.phase)*.00009}}");
s=s.replace("const pointer=new THREE.Vector2()", "if(mode!=='seats')host.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();const p=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(p,camera);const hit=ray.intersectObjects(floaters.map(f=>f.obj),true)[0];if(hit){let o=hit.object;while(o&&!o.userData.href)o=o.parent;if(o)location.href=o.userData.href}});\n const pointer=new THREE.Vector2()");
fs.writeFileSync(file,s);console.log('3D film gallery installed');
