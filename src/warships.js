import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const steel=new THREE.MeshStandardMaterial({color:0x555957,roughness:.64,metalness:.8});
const armor=new THREE.MeshStandardMaterial({color:0x353b3c,roughness:.72,metalness:.75});
const dark=new THREE.MeshStandardMaterial({color:0x202727,roughness:.7,metalness:.65});
const grain=new Uint8Array(128*128*4);
for(let y=0;y<128;y++)for(let x=0;x<128;x++){
 const seam=x%16<2,vein=Math.sin(x*2.8+Math.sin(y*.09)*1.5)+Math.sin(x*8+y*.04)*.4;
 const value=seam?65:155+vein*24+Math.sin(x*71+y*39)*9;
 const i=(y*128+x)*4;grain[i]=grain[i+1]=grain[i+2]=value;grain[i+3]=255;
}
const woodTexture=new THREE.DataTexture(grain,128,128);woodTexture.wrapS=woodTexture.wrapT=THREE.RepeatWrapping;woodTexture.needsUpdate=true;
const wood=new THREE.MeshStandardMaterial({color:0x846044,map:woodTexture,bumpMap:woodTexture,bumpScale:.075,roughness:1,metalness:0});
const deck=new THREE.MeshStandardMaterial({color:0xb39165,map:woodTexture,bumpMap:woodTexture,bumpScale:.04,roughness:1,metalness:0});
const timber=new THREE.MeshStandardMaterial({color:0x483222,map:woodTexture,roughness:1});
const rust=new THREE.MeshStandardMaterial({color:0x795c45,roughness:1});
const light=new THREE.MeshStandardMaterial({color:0xffcf80,emissive:0xe89336,emissiveIntensity:.7});
const foam=new THREE.MeshBasicMaterial({color:0xc4e9df,transparent:true,opacity:.32,side:THREE.DoubleSide,depthWrite:false});
function box(g,w,h,d,m,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);g.add(mesh);return mesh;}
function rod(g,a,b,r,m){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r*.8,r,direction.length(),8),m);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());g.add(mesh);}
function merge(g){g.updateMatrixWorld(true);const batches=new Map();for(const m of [...g.children]){if(!m.isMesh)continue;const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);if(!batches.has(m.material))batches.set(m.material,[]);batches.get(m.material).push(geo);m.geometry.dispose();g.remove(m);}for(const [m,geos] of batches){g.add(new THREE.Mesh(mergeGeometries(geos),m));geos.forEach(geo=>geo.dispose());}}

export function createWarship(){
 const root=new THREE.Group();root.name='ancient-patrol-warship';const body=new THREE.Group();root.add(body);
 // An old timber hull with a pointed bow and a shallow submerged keel.
 const outline=[[-1.8,-7],[1.8,-7],[2.65,-3],[2.4,4],[0,9],[-2.4,4],[-2.65,-3]];
 const positions=[],indices=[];
 for(const [y,width] of [[-1.7,.55],[-.55,1],[.45,1]])for(const [x,z] of outline)positions.push(x*width,y,z);
 for(let level=0;level<2;level++)for(let i=0;i<7;i++){const a=level*7+i,b=level*7+(i+1)%7;indices.push(a,a+7,b,b,a+7,b+7);}
 for(let i=1;i<6;i++)indices.push(14,14+i+1,14+i);
 const uv=[];for(let i=0;i<positions.length;i+=3)uv.push(positions[i]/6+.5,positions[i+2]/16+.5);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();body.add(new THREE.Mesh(geo,wood));
 for(let i=0;i<11;i++)box(body,.33,.22,9.8,i%3===0?wood:deck,-1.8+i*.36,.52,-.5);
 // Raised plank seams and gunwales follow the complete hull outline.
 for(let level=0;level<5;level++)for(let i=0;i<outline.length;i++){
  const a=outline[i],b=outline[(i+1)%outline.length],y=-.5+level*.23;
  rod(body,[a[0]*1.006,y,a[1]],[b[0]*1.006,y,b[1]],level===4?.1:.035,timber);
 }
 box(body,2.5,1.25,3.2,wood,0,1.22,-2.8);box(body,2.9,.2,3.65,timber,0,1.94,-2.8);
 for(let i=0;i<5;i++)box(body,.42,.11,3.7,deck,-1.04+i*.52,2.07,-2.8);
 for(const x of [-.72,.72])box(body,.47,.38,.05,dark,x,1.47,-1.17);
 for(const side of [-1,1]){
  for(let i=0;i<5;i++){
   box(body,.12,.87,.16,dark,side*(2.6-i*.04),-.02,-3.4+i*1.65);
   box(body,.14,.12,.2,rust,side*(2.66-i*.04),.22,-3.4+i*1.65);
   rod(body,[side*2.08,.63,-5+i*2],[side*2.08,1.16,-5+i*2],.07,timber);
  }
  rod(body,[side*2.08,1.16,-5],[side*2.08,1.16,3],.055,timber);
  box(body,.8,.6,1.6,wood,side*1.1,.94,-5.1);
 }
 rod(body,[0,2.12,-3],[0,4.4,-3],.1,timber);rod(body,[-.9,3.8,-3],[.9,3.8,-3],.065,timber);
 box(body,.26,.38,.26,dark,.58,3.48,-3);box(body,.2,.24,.28,light,.58,3.49,-3);
 const turret=new THREE.Group();turret.position.set(0,1,3.5);body.add(turret);
 box(turret,2.2,.8,2.3,armor,0,.1,0);box(turret,1.6,.18,1.5,dark,0,.62,-.1);
 for(const side of [-1,1])for(let i=0;i<4;i++)box(turret,.09,.09,.1,steel,side*1.12,.18,-.75+i*.5);
 for(const side of [-1,1]){rod(turret,[side*.43,.22,.5],[side*.43,.22,3.5],.17,dark);rod(turret,[side*.43,.22,2.7],[side*.43,.22,3.65],.22,steel);}
 const muzzle=new THREE.Object3D();muzzle.position.set(0,.22,3.7);turret.add(muzzle);merge(turret);merge(body);
 const wakes=[];
 for(const side of [-1,1]){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([side*1.6,0,-5,side*2.1,0,-7,side*5.8,0,-22,side*4.8,0,-20],3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();
  const wake=new THREE.Mesh(g,foam);wake.position.y=-.6;root.add(wake);wakes.push(wake);
 }
 root.userData.rig={body,turret,muzzle,wakes};return root;
}

export function seaHeight(x,z,time,travel){
 let height=-2;
 for(const [dx,dz,steep,wavelength] of [[.93,.37,.12,58],[-.35,.94,.1,29],[.62,-.78,.075,16],[.89,.46,.045,8.5]]){
  const k=Math.PI*2/wavelength,n=Math.hypot(dx,dz);
  height+=steep/k*Math.sin(k*(dx*x+dz*(z-travel))/n-Math.sqrt(9.81*k)*time);
 }
 return height;
}

export function updateWarship(model,worldPosition,target,time,travel,dt){
 const rig=model.userData.rig;
 worldPosition.y=seaHeight(worldPosition.x,worldPosition.z,time,travel)+.95;
 const pitch=(seaHeight(worldPosition.x,worldPosition.z+6,time,travel)-seaHeight(worldPosition.x,worldPosition.z-6,time,travel))/12;
 const roll=(seaHeight(worldPosition.x+2,worldPosition.z,time,travel)-seaHeight(worldPosition.x-2,worldPosition.z,time,travel))/4;
 rig.body.rotation.x=THREE.MathUtils.damp(rig.body.rotation.x,pitch,3,dt);rig.body.rotation.z=THREE.MathUtils.damp(rig.body.rotation.z,-roll,3,dt);
 model.updateWorldMatrix(true,true);rig.turret.lookAt(target);rig.wakes.forEach((w,i)=>{w.scale.x=1+Math.sin(time*2+i)*.07;});
}

export function warshipMuzzle(model){model.updateWorldMatrix(true,true);return model.userData.rig.muzzle.getWorldPosition(new THREE.Vector3());}
