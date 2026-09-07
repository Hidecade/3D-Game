import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// A repeating underground lake, with a wide clear flight corridor in the middle.
export function createCavern(){
 const root=new THREE.Group();root.name='crystal-cavern';
 const rock=new THREE.MeshStandardMaterial({color:0x35434b,roughness:.95,side:THREE.DoubleSide,flatShading:true});
 const crystal=new THREE.MeshStandardMaterial({color:0x87e4ef,emissive:0x299da9,emissiveIntensity:.85,metalness:.25,roughness:.3});
 const violet=new THREE.MeshStandardMaterial({color:0xc6a4e9,emissive:0x634aa5,emissiveIntensity:.6,roughness:.4});
 const tiles=[];let seed=419;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let tile=0;tile<12;tile++){
  const group=new THREE.Group();group.position.z=tile*100-850;root.add(group);tiles.push(group);
  const positions=[],indices=[],sides=24,rings=8;
  for(let j=0;j<=rings;j++)for(let i=0;i<=sides;i++){
   const angle=i/sides*Math.PI*2,z=j/rings*100;
   const rough=1+Math.sin(angle*5)*.045+Math.sin(angle*3+z*Math.PI/50)*.055;
   positions.push(Math.cos(angle)*108*rough,40+Math.sin(angle)*58*rough,z);
   if(j<rings&&i<sides){const a=j*(sides+1)+i;indices.push(a,a+1,a+sides+1,a+1,a+sides+2,a+sides+1);}
  }
  const shell=new THREE.BufferGeometry();shell.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));shell.setIndex(indices);shell.computeVertexNormals();
  group.add(new THREE.Mesh(shell,rock));
  const batches=new Map([[rock,[]],[crystal,[]],[violet,[]]]);
  function add(geo,material,x,y,z,sx,sy,sz,rx=0,rz=0){
   const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,0,rz)),new THREE.Vector3(sx,sy,sz));
   const flat=geo.index?geo.toNonIndexed():geo;flat.applyMatrix4(matrix);if(flat!==geo)geo.dispose();batches.get(material).push(flat);
  }
  for(let i=0;i<12;i++){
   const side=i%2?1:-1,x=side*(65+random()*28),z=random()*100;
   add(new THREE.IcosahedronGeometry(1,1),rock,x,random()*3-3,z,8+random()*9,7+random()*13,9+random()*9);
   for(let k=0;k<3;k++)add(new THREE.ConeGeometry(1,1,5),i%3?crystal:violet,x+(random()-.5)*10,3+random()*5,z+(random()-.5)*10,1.4+random()*2,8+random()*11,1.4+random()*2,random()*.4,side*random()*.5);
  }
  for(let i=0;i<13;i++){
   const x=(random()-.5)*160,height=8+random()*19;
   add(new THREE.ConeGeometry(1,1,7),rock,x,81-height*.5,random()*100,3+random()*5,height,3+random()*5,Math.PI);
  }
  for(const [material,geos] of batches){group.add(new THREE.Mesh(mergeGeometries(geos),material));geos.forEach(g=>g.dispose());}
 }
 root.visible=false;
 return {root,update(travel){for(let i=0;i<tiles.length;i++)tiles[i].position.z=((i*100+travel)%1200)-850;}};
}
