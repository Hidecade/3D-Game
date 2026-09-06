import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const shell=new THREE.MeshStandardMaterial({color:0x424c49,metalness:.55,roughness:.55});
const ridge=new THREE.MeshStandardMaterial({color:0x8e8460,metalness:.6,roughness:.5});
const membrane=new THREE.MeshStandardMaterial({color:0xc6ac56,transparent:true,opacity:.7,side:THREE.DoubleSide,roughness:.42,metalness:.25,depthWrite:false});
const vein=new THREE.LineBasicMaterial({color:0xebca6e});
const eye=new THREE.MeshStandardMaterial({color:0xffda60,emissive:0xef9c20,emissiveIntensity:1.4});
function oval(g,m,x,y,z,sx,sy,sz){const o=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);g.add(o);}
function horn(g,a,b,r){const d=b.clone().sub(a),o=new THREE.Mesh(new THREE.ConeGeometry(r,d.length(),6),ridge);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());g.add(o);}
function bake(g){
 const groups=new Map();
 for(const o of [...g.children])if(o.isMesh){o.updateMatrix();const geo=o.geometry.toNonIndexed().applyMatrix4(o.matrix);if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(geo);o.geometry.dispose();g.remove(o);}
 for(const [m,geos] of groups){g.add(new THREE.Mesh(mergeGeometries(geos),m));geos.forEach(geo=>geo.dispose());}
}
function wing(g,side,rear){
 const length=rear?4.7:5.4, sweep=rear?1.25:-1.15, points=[V(0,0,0)],lines=[];
 const n=18;
 for(let i=0;i<=n;i++){
  const u=i/n,w=Math.sin(Math.PI*u)*.68;
  points.push(V(side*length*u,.06*Math.sin(Math.PI*u),sweep*u-w));
 }
 for(let i=n-1;i>=0;i--){const u=i/n;points.push(V(side*length*u,0,sweep*u+Math.sin(Math.PI*u)*.68));}
 const indices=[];for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));geo.setIndex(indices);geo.computeVertexNormals();g.add(new THREE.Mesh(geo,membrane));
 for(let i=1;i<points.length-1;i++)lines.push(points[i],points[i+1]);
 for(let i=1;i<12;i++){
  const u=i/12,center=V(side*length*u,.025,sweep*u),w=Math.sin(Math.PI*u)*.63;
  lines.push(V(0,.025,0),center,center,center.clone().add(V(-side*.22,0,-w)),center,center.clone().add(V(-side*.22,0,w)));
 }
 g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lines),vein));
}
export function createSkyInsect(){
 const root=new THREE.Group();root.name='four-wing-sky-insect';
 for(let i=0;i<4;i++){
  const z=-1.2+i*.65;
  oval(root,shell,0,0,z,.58,.42,.48);oval(root,ridge,0,.29,z,.23,.2,.4);
  for(const s of [-1,1])horn(root,V(s*.44,.14,z),V(s*.86,.38,z+.25),.12);
 }
 const neck=new THREE.Group();neck.position.set(0,0,-1.8);root.add(neck);
 oval(neck,shell,0,0,-.3,.6,.35,.58);
 const jaw=new THREE.Group();neck.add(jaw);
 for(const s of [-1,1]){
  oval(neck,eye,s*.43,.17,-.57,.14,.13,.16);
  horn(jaw,V(s*.4,-.12,-.65),V(s*.72,-.1,-1.2),.17);
  horn(jaw,V(s*.72,-.1,-1.2),V(s*.25,-.08,-1.45),.12);
  horn(neck,V(s*.35,.2,-.4),V(s*.75,.85,-1.15),.06);
  for(let i=0;i<3;i++){
   horn(root,V(s*.4,-.2,-1+i*.65),V(s*.9,-.55,-.6+i*.65),.08);
   horn(root,V(s*.9,-.55,-.6+i*.65),V(s*.75,-.8,-.2+i*.65),.055);
  }
 }
 const mouth=new THREE.Object3D();mouth.position.set(0,-.1,-1.3);neck.add(mouth);
 const tail=[];let parent=root;
 for(let i=0;i<5;i++){
  const part=new THREE.Group();part.position.z=i?.63:1;parent.add(part);
  const r=.43-i*.065;oval(part,shell,0,0,.25,r,r*.7,.45);
  horn(part,V(0,.12,.2),V(0,.46-i*.035,.65),r*.4);
  if(i===4)horn(part,V(0,0,.5),V(0,.3,1.7),.15);
  bake(part);tail.push(part);parent=part;
 }
 const wings=[];
 for(const rear of [false,true])for(const side of [-1,1]){
  const shoulder=new THREE.Group();shoulder.position.set(side*.45,.2,rear?.55:-.85);root.add(shoulder);
  wing(shoulder,side,rear);wings.push({shoulder,side,rear});
 }
 bake(jaw);bake(neck);bake(root);
 root.userData.rig={wings,tail,neck,jaw,mouth};return root;
}
export function animateSkyInsect(root,time){
 const rig=root.userData.rig;
 for(const {shoulder,side,rear} of rig.wings){const phase=time*25+(rear?Math.PI*.65:0);shoulder.rotation.z=side*(.1+Math.sin(phase)*.42);shoulder.rotation.x=Math.cos(phase)*.12;}
 rig.tail.forEach((p,i)=>{p.rotation.y=Math.sin(time*4-i*.55)*.075;p.rotation.x=-.035;});
 rig.jaw.rotation.x=.05+Math.sin(time*6)*.06;
}
