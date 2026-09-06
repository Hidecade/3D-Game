import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const palettes={
 amber:[0x69442d,0xc7a66b,0xeadbb5,0x302c30,0xd59b39],
 storm:[0x344958,0x819aa1,0xe4e6d9,0x242c3c,0xb9a264],
};
const materials=new Map();
function plumage(kind){
 if(!materials.has(kind)){
  const colors=palettes[kind];
  materials.set(kind,colors.map(color=>new THREE.MeshStandardMaterial({color,roughness:.8,side:THREE.DoubleSide})));
 }
 return materials.get(kind);
}
function oval(parent,material,x,y,z,sx,sy,sz){
 const m=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),material);
 m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;
}
function feather(parent,material,base,tip,width){
 const a=V(...base),b=V(...tip),d=b.clone().sub(a);
 const side=V(-d.z,0,d.x).normalize().multiplyScalar(width);
 const mid=a.clone().lerp(b,.48),ridge=mid.clone().add(V(0,.1,0));
 const points=[a,mid.clone().add(side),b,mid.clone().sub(side),ridge];
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));
 geo.setIndex([0,1,4,1,2,4,2,3,4,3,0,4]);geo.computeVertexNormals();
 parent.add(new THREE.Mesh(geo,material));
}
function claw(parent,material,a,b,r){
 const delta=b.clone().sub(a);
 const m=new THREE.Mesh(new THREE.ConeGeometry(r,delta.length(),7),material);
 m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());parent.add(m);
}
function bake(group){
 const buckets=new Map();
 for(const m of [...group.children])if(m.isMesh){
  m.updateMatrix();const geo=m.geometry.toNonIndexed().applyMatrix4(m.matrix);geo.deleteAttribute('uv');
  if(!buckets.has(m.material))buckets.set(m.material,[]);
  buckets.get(m.material).push(geo);m.geometry.dispose();group.remove(m);
 }
 for(const [material,geos] of buckets){group.add(new THREE.Mesh(mergeGeometries(geos),material));geos.forEach(g=>g.dispose());}
}

// Lean raptor silhouette with oversized flight feathers and a narrow predatory gaze.
// Articulation matches the flight and breakup rigs used by the game.
export function createSkyBeast({kind='amber'}={}){
 const root=new THREE.Group();root.name='eagle-sky-beast';
 const [dark,cover,ivory,tips,gold]=plumage(kind);
 oval(root,dark,0,0,0,.85,.86,1.8);
 oval(root,cover,0,-.28,-.75,.82,.78,.95);
 for(let row=0;row<3;row++)for(let s=-1;s<=1;s++)
  feather(root,row%2?cover:ivory,[s*.34,.65-row*.17,-1+row*.65],[s*.5,.4-row*.17,.1+row*.65],.26);
 const neck=new THREE.Group();neck.position.set(0,.48,-1.28);root.add(neck);
 oval(neck,ivory,0,.2,-.35,.48,.46,.7);
 // Hooked beak, built from a broad upper ridge ending in a downward point.
 const profile=[[-.72,.38],[-1.19,.28],[-1.5,-.08],[-1.36,-.48],[-1.16,-.13],[-.72,-.08]];
 const vertices=[];for(const x of [-.22,.22])for(const [z,y] of profile)vertices.push(x,y,z);
 const indices=[];for(let i=1;i<5;i++)indices.push(0,i+1,i,6,6+i,7+i);
 for(let i=0;i<6;i++){const n=(i+1)%6;indices.push(i,n,i+6,n,n+6,i+6);}
 const beak=new THREE.BufferGeometry();beak.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));beak.setIndex(indices);beak.computeVertexNormals();
 neck.add(new THREE.Mesh(beak,gold));
 const jaw=new THREE.Group();neck.add(jaw);oval(jaw,gold,0,-.14,-.89,.17,.09,.3);
 for(const s of [-1,1]){
  // Pointed almond eyes sit below a heavy, sloping brow instead of round sockets.
  const eye=new THREE.BufferGeometry();
  eye.setAttribute('position',new THREE.Float32BufferAttribute([
   s*.445,.23,-.94, s*.49,.38,-.6, s*.445,.4,-.35, s*.49,.26,-.61,
  ],3));
  eye.setIndex([0,1,3,1,2,3]);eye.computeVertexNormals();neck.add(new THREE.Mesh(eye,gold));
  oval(neck,tips,s*.505,.305,-.65,.02,.058,.027);
  const brow=oval(neck,dark,s*.45,.405,-.64,.085,.07,.34);brow.rotation.x=-.28;
  feather(neck,dark,[s*.25,.53,-.35],[s*.48,.77,.8],.15);
  feather(neck,ivory,[s*.3,.04,-.25],[s*.57,-.1,.68],.2);
 }
 const mouth=new THREE.Object3D();mouth.position.set(0,-.12,-1.47);neck.add(mouth);
 const wings=[];
 for(const s of [-1,1]){
  const shoulder=new THREE.Group();shoulder.position.set(s*.46,.25,-.34);shoulder.scale.set(1.32,1,1.16);root.add(shoulder);
  // Feathered wing roots, with no exposed arm or hand-like bulges.
  for(let i=0;i<4;i++)feather(shoulder,dark,[s*i*.4,0,-.35],[s*(.75+i*.4),0,.85],.36);
  for(let i=0;i<7;i++)feather(shoulder,i%2?cover:dark,[s*(.15+i*.3),.1,0],[s*(.65+i*.32),-.04,1.5+i*.08],.27);
  const outer=new THREE.Group();outer.position.set(s*2.35,0,.08);shoulder.add(outer);
  for(let i=0;i<9;i++){
   feather(outer,i%3===0?ivory:cover,[s*i*.12,.02,i*.09],[s*(2.6-i*.12),-.05,-.65+i*.42],.23);
   feather(outer,tips,[s*(1.6-i*.065),-.02,-.35+i*.32],[s*(2.65-i*.12),-.04,-.65+i*.42],.15);
  }
  bake(outer);bake(shoulder);wings.push({shoulder,outer,side:s});
  // Two small bird feet tucked back under the belly in flight.
  oval(root,cover,s*.42,-.61,.7,.19,.22,.28);
  oval(root,gold,s*.43,-.78,.83,.065,.14,.08);
  for(let i=0;i<3;i++)claw(root,tips,V(s*.43+(i-1)*.065,-.88,.84),V(s*.43+(i-1)*.095,-1.01,1.06),.042);
 }
 const fan=new THREE.Group();fan.position.set(0,.05,1.4);root.add(fan);
 for(let i=-3;i<=3;i++)feather(fan,i%2?cover:ivory,[i*.1,0,0],[i*.4,-.15,2.2-Math.abs(i)*.15],.25);
 bake(fan);bake(jaw);bake(neck);bake(root);
 // Shrink the torso and talons together while keeping the full feathered wingspan.
 for(const part of root.children)if(part.isMesh)part.scale.set(.7,.7,.82);
 neck.position.set(0,.34,-1.05);neck.scale.set(.86,.86,.9);
 fan.position.z=1.15;fan.scale.set(.85,.85,.85);
 root.userData.rig={wings,tail:[fan],neck,jaw,mouth,scarf:null,ancient:false};
 return root;
}
