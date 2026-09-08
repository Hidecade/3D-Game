import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Repeating masonry relief, with staggered joints and weathered stone grain.
const pixels=new Uint8Array(256*256*4);
for(let y=0;y<256;y++)for(let x=0;x<256;x++){
 const row=Math.floor(y/32),joint=y%32<2||(x+(row%2)*32)%64<2;
 const grain=Math.sin(x*19.7+y*11.3)*Math.sin(x*5.3-y*23.1);
 const shade=joint?65:153+grain*19+Math.sin(x*.08+y*.025)*12;
 const i=(y*256+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=shade;pixels[i+3]=255;
}
const texture=new THREE.DataTexture(pixels,256,256);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;

export function createAncientPassage(){
 const root=new THREE.Group();root.name='ancient-arched-passage';
 const stone=new THREE.MeshStandardMaterial({color:0x69727c,map:texture,bumpMap:texture,bumpScale:.22,roughness:.94,side:THREE.DoubleSide});
 const trim=new THREE.MeshStandardMaterial({color:0x89919a,map:texture,bumpMap:texture,bumpScale:.13,roughness:.88});
 const recess=new THREE.MeshStandardMaterial({color:0x19222f,roughness:1});
 const glow=new THREE.MeshBasicMaterial({color:0xbcd8de});
 const reflected=new THREE.MeshBasicMaterial({color:0xb6c9d5,transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide});
 const materials=[stone,trim,recess,glow,reflected];
 function box(w,h,d,mat,x,y,z){
  const geometry=new THREE.BoxGeometry(w,h,d),p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
  for(let i=0;i<p.count;i++){
   if(Math.abs(n.getX(i))>.5)uv.setXY(i,p.getZ(i)/12,p.getY(i)/10);
   else if(Math.abs(n.getY(i))>.5)uv.setXY(i,p.getX(i)/12,p.getZ(i)/12);
   else uv.setXY(i,p.getX(i)/12,p.getY(i)/10);
  }
  const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);root.add(m);return m;
 }
 // A broad central lane and raised, sloping side ledges echo a forgotten aqueduct.
 box(50,2,360,stone,0,.5,-180);
 for(const side of [-1,1]){
  box(3,26,360,stone,side*26.5,14,-180);
  box(5,3,360,trim,side*22.5,2.4,-180);
  const slope=box(1.4,4.3,360,trim,side*19.7,2.6,-180);slope.rotation.z=side*.48;
  box(.45,.35,360,recess,side*15,1.56,-180);
 }
 // Two quadratic curves meet at a pointed crown, with square-section stone ribs.
 const left=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-25,26,0),new THREE.Vector3(-24,44,0),new THREE.Vector3(0,53,0));
 const right=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,53,0),new THREE.Vector3(24,44,0),new THREE.Vector3(25,26,0));
 const arch=[...left.getPoints(12),...right.getPoints(12).slice(1)];
 const positions=[],uv=[],indices=[];
 for(let i=0;i<arch.length;i++)for(const z of [0,-360]){
  positions.push(arch[i].x,arch[i].y,z);uv.push(i/4,-z/24);
  if(i<arch.length-1&&z===0){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
 }
 const roof=new THREE.BufferGeometry();roof.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));roof.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));roof.setIndex(indices);roof.computeVertexNormals();root.add(new THREE.Mesh(roof,stone));
 for(let bay=0;bay<=15;bay++){
  const z=-bay*24;
  for(const side of [-1,1]){
   box(3,25,2.6,trim,side*24,14,z);
   box(4.6,2.3,4,trim,side*24,2.6,z);
   box(4.1,1.7,3.5,trim,side*24,26,z);
   if(bay<15){
    box(.16,16,13,recess,side*24.94,15,z-12);
    box(.22,9,1.1,glow,side*24.8,17,z-9);
    const light=new THREE.Mesh(new THREE.PlaneGeometry(3.4,11),reflected);
    light.rotation.set(-Math.PI/2,0,side*.48);light.position.set(side*9,1.515,z-11);root.add(light);
   }
  }
  for(let i=0;i<arch.length-1;i++){
   const a=arch[i],b=arch[i+1],delta=b.clone().sub(a);
   const rib=box(1.5,delta.length()+.15,2.6,trim,(a.x+b.x)/2,(a.y+b.y)/2,z);
   rib.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  }
  box(2.6,3.4,3.1,trim,0,51.8,z);
 }
 // Merge hundreds of masonry pieces into five material batches for mobile.
 root.updateMatrixWorld(true);
 for(const material of materials){
  const geometries=[];
  for(const mesh of [...root.children])if(mesh.material===material){
   const geo=mesh.geometry.clone().applyMatrix4(mesh.matrix);geometries.push(geo.index?geo.toNonIndexed():geo);
   if(geo.index)geo.dispose();mesh.geometry.dispose();root.remove(mesh);
  }
  if(geometries.length){const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());root.add(new THREE.Mesh(merged,material));}
 }
 return {root,dispose(){root.traverse(o=>o.geometry?.dispose());materials.forEach(m=>m.dispose());root.removeFromParent();}};
}
