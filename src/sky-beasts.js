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

// Eagle silhouette with a heavy beast's breast, crown plumage and grasping talons.
// Articulation matches the flight and breakup rigs used by the game.
export function createSkyBeast({kind='amber'}={}){
 const root=new THREE.Group();root.name='eagle-sky-beast';
 const [dark,cover,ivory,tips,gold]=plumage(kind);
 oval(root,dark,0,0,0,.85,.86,1.8);
 oval(root,cover,0,-.28,-.75,.82,.78,.95);
 for(let row=0;row<3;row++)for(let s=-1;s<=1;s++)
  feather(root,row%2?cover:ivory,[s*.34,.65-row*.17,-1+row*.65],[s*.5,.4-row*.17,.1+row*.65],.26);
 const neck=new THREE.Group();neck.position.set(0,.48,-1.28);root.add(neck);
 oval(neck,ivory,0,.23,-.35,.6,.65,.7);
 // Hooked beak, built from a broad upper ridge ending in a downward point.
 const profile=[[-.72,.38],[-1.19,.28],[-1.5,-.08],[-1.36,-.48],[-1.16,-.13],[-.72,-.08]];
 const vertices=[];for(const x of [-.22,.22])for(const [z,y] of profile)vertices.push(x,y,z);
 const indices=[];for(let i=1;i<5;i++)indices.push(0,i+1,i,6,6+i,7+i);
 for(let i=0;i<6;i++){const n=(i+1)%6;indices.push(i,n,i+6,n,n+6,i+6);}
 const beak=new THREE.BufferGeometry();beak.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));beak.setIndex(indices);beak.computeVertexNormals();
 neck.add(new THREE.Mesh(beak,gold));
 const jaw=new THREE.Group();neck.add(jaw);oval(jaw,gold,0,-.14,-.89,.17,.09,.3);
 for(const s of [-1,1]){
  oval(neck,gold,s*.5,.33,-.65,.09,.13,.16);
  oval(neck,tips,s*.56,.34,-.69,.025,.085,.075);
  feather(neck,dark,[s*.3,.62,-.35],[s*.65,1.2,.5],.19);
  feather(neck,ivory,[s*.37,.04,-.25],[s*.72,-.15,.65],.26);
 }
 const mouth=new THREE.Object3D();mouth.position.set(0,-.12,-1.47);neck.add(mouth);
 const wings=[];
 for(const s of [-1,1]){
  const shoulder=new THREE.Group();shoulder.position.set(s*.65,.35,-.4);root.add(shoulder);
  oval(shoulder,dark,s*1.1,0,.12,1.4,.22,.7);
  for(let i=0;i<7;i++)feather(shoulder,i%2?cover:dark,[s*(.15+i*.3),.1,0],[s*(.65+i*.32),-.04,1.5+i*.08],.27);
  const outer=new THREE.Group();outer.position.set(s*2.35,0,.08);shoulder.add(outer);
  for(let i=0;i<9;i++){
   feather(outer,i%3===0?ivory:cover,[s*i*.12,.02,i*.09],[s*(2.6-i*.12),-.05,-.65+i*.42],.23);
   feather(outer,tips,[s*(1.6-i*.065),-.02,-.35+i*.32],[s*(2.65-i*.12),-.04,-.65+i*.42],.15);
  }
  bake(outer);bake(shoulder);wings.push({shoulder,outer,side:s});
  oval(root,cover,s*.58,-.67,.65,.35,.5,.45);
  oval(root,gold,s*.61,-1.12,.45,.12,.32,.13);
  for(let i=0;i<3;i++)claw(root,tips,V(s*.61+(i-1)*.14,-1.3,.43),V(s*.61+(i-1)*.23,-1.65,-.12),.09);
 }
 const fan=new THREE.Group();fan.position.set(0,.05,1.4);root.add(fan);
 for(let i=-3;i<=3;i++)feather(fan,i%2?cover:ivory,[i*.1,0,0],[i*.4,-.15,2.2-Math.abs(i)*.15],.25);
 bake(fan);bake(jaw);bake(neck);bake(root);
 root.userData.rig={wings,tail:[fan],neck,jaw,mouth,scarf:null,ancient:false};
 return root;
}
