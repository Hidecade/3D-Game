import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const shell=new THREE.MeshStandardMaterial({color:0x63776b,roughness:.56,metalness:.22});
const edge=new THREE.MeshStandardMaterial({color:0xba9260,roughness:.55,metalness:.3});
const dark=new THREE.MeshStandardMaterial({color:0x242f31,roughness:.8});
const glow=new THREE.MeshStandardMaterial({color:0xffba6c,emissive:0xef702e,emissiveIntensity:1.6});
const membrane=new THREE.MeshStandardMaterial({color:0x92beb6,side:THREE.DoubleSide,transparent:true,opacity:.65,roughness:.5});
function oval(group,material,position,scale){const m=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),material);m.position.set(...position);m.scale.set(...scale);group.add(m);return m;}
function bone(group,a,b,r,material=edge){const direction=V(...b).sub(V(...a));const m=new THREE.Mesh(new THREE.CylinderGeometry(r*.55,r,direction.length(),7),material);m.position.copy(V(...a)).add(V(...b)).multiplyScalar(.5);m.quaternion.setFromUnitVectors(V(0,1,0),direction.normalize());group.add(m);}
function bake(group){
 const batches=new Map();group.updateMatrixWorld(true);
 for(const mesh of [...group.children]){if(!mesh.isMesh)continue;const g=mesh.geometry.toNonIndexed();g.applyMatrix4(mesh.matrix);if(!batches.has(mesh.material))batches.set(mesh.material,[]);batches.get(mesh.material).push(g);mesh.geometry.dispose();group.remove(mesh);}
 for(const [material,geos] of batches){group.add(new THREE.Mesh(mergeGeometries(geos),material));geos.forEach(g=>g.dispose());}
}

export function createCentipede(){
 const root=new THREE.Group();root.name='sky-centipede';const segments=[];
 for(let i=0;i<16;i++){
  const part=new THREE.Group();part.name=i?'centipede-segment-'+i:'centipede-head';root.add(part);
  const size=i===0?1.3:1-(i/20)*.35;
  oval(part,dark,[0,0,0],[1.2*size,.8*size,1.45]);
  oval(part,shell,[0,.3,0],[1.47*size,.92*size,1.25]);
  for(let j=0;j<3;j++)oval(part,edge,[0,.63,-.7+j*.55],[1.36*size,.35*size,.12]);
  oval(part,glow,[0,.97*size,.1],[.32,.2,.48]);
  const legs=[],wings=[];
  for(const side of [-1,1]){
   const leg=new THREE.Group();leg.position.set(side*1.1*size,-.05,0);part.add(leg);
   bone(leg,[0,0,0],[side*1.25,-.28,-.6],.16);
   bone(leg,[side*1.25,-.28,-.6],[side*1.9,-1,-1.5],.1,dark);
   bone(leg,[side*1.9,-1,-1.5],[side*1.72,-1.2,-1.9],.06,edge);bake(leg);legs.push({mesh:leg,side});
   if(i%3===1){
    const wing=new THREE.Group();wing.position.set(side*.9,.6,-.2);part.add(wing);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,side*4,.4,-.7,side*3.6,0,-2.1,side*.6,-.1,-1.5],3));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();wing.add(new THREE.Mesh(geometry,membrane));
    bone(wing,[0,0,0],[side*4,.4,-.7],.055);bone(wing,[0,0,0],[side*3.6,0,-2.1],.04);bake(wing);wings.push({mesh:wing,side});
   }
  }
  if(i===0){
   oval(part,shell,[0,.15,1],[1.6,.9,1.1]);
   for(const side of [-1,1]){
    oval(part,glow,[side*.93,.62,1.64],[.35,.25,.27]);
    bone(part,[side*.75,.71,1],[side*1.5,1.6,1.8],.14);
    bone(part,[side*1.5,1.6,1.8],[side*1.85,2.4,2.45],.075,dark);
    bone(part,[side*.8,-.25,1.5],[side*1.65,-.45,2.3],.24);
    bone(part,[side*1.65,-.45,2.3],[side*.55,-.4,3],.16,dark);
   }
  }
  if(i===15)for(const side of [-1,1])bone(part,[side*.5,0,-.8],[side*1.6,.3,-3.2],.18);
  bake(part);segments.push({mesh:part,legs,wings});
 }
 root.userData.segments=segments;animateCentipede(root,0);return root;
}

function path(time){return V(Math.sin(time*.7)*20,14+Math.sin(time*1.13)*6,-66+Math.cos(time*.7)*14);}
export function animateCentipede(root,age){
 root.userData.segments.forEach((segment,i)=>{
  const phase=age-i*.22,p=path(phase),next=path(phase+.03);
  p.z-=65*Math.exp(-age*.85);next.z-=65*Math.exp(-age*.85);
  segment.mesh.position.copy(p);segment.mesh.lookAt(next);
  segment.legs.forEach(({mesh,side})=>{mesh.rotation.y=side*Math.sin(age*5-i*.52)*.28;mesh.rotation.z=side*Math.cos(age*5-i*.52)*.18;});
  segment.wings.forEach(({mesh,side})=>{mesh.rotation.z=side*Math.sin(age*9-i*.5)*.38;});
 });
 root.updateMatrixWorld(true);
}
