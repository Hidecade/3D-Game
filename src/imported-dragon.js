import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let assetPromise;
const modelUrl=new URL('../assets/models/player-dragon.glb',import.meta.url).href;

// The supplied model has separate anatomy meshes, but no skeleton or clips.
// Bake its standing pose into a flight pose, then articulate those parts.
export function prepareImportedDragon(source){
 const root=new THREE.Group();root.name='textured-player-dragon';
 const part=(name,p)=>{const g=new THREE.Group();g.name=name;g.position.set(...p);root.add(g);return g;};
 const body=part('body',[0,0,0]),neck=part('neck',[0,0,-.45]);
 const jaw=part('jaw',[0,1.65,-2.8]),tail=part('tail',[0,-.55,1.25]);
 const wings=[-1,1].map(side=>({side,shoulder:part('wing', [side*.85,0,.45]),outer:new THREE.Group()}));
 for(const w of wings)w.shoulder.add(w.outer);
 const legs=[];for(const side of [-1,1])for(const front of [true,false])legs.push({side,front,joint:part('leg',[side*.8,front?-.3:-.9,front?0:.9])});
 const buckets=new Map();source.updateMatrixWorld(true);
 source.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const name=mesh.name.replaceAll('_',' ');if(name.startsWith('Basalt'))return;
  let geo=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);geo.computeBoundingBox();
  const center=geo.boundingBox.getCenter(new THREE.Vector3()),side=center.x<0?1:-1;
  const wing=/^(Wing |Scalloped jade)/.test(name);
  let group=body;
  if(wing)group=wings.find(w=>w.side===side).outer;
  else if(/tail/i.test(name))group=tail;
  else if(/^(Foreleg|Front |Hind |Leg armor)/.test(name)){
   const front=/^(Foreleg|Front )/.test(name)||name.startsWith('Leg armor')&&center.z>0;
   group=legs.find(l=>l.side===side&&l.front===front).joint;
  }else if(/^(Lower jaw|Lower tooth|Tongue)/.test(name))group=jaw;
  else if(center.y>3.3||/^(Curved armored neck|Neck side)/.test(name))group=neck;
  const positions=geo.attributes.position;
  for(let i=0;i<positions.count;i++){
   const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
   // +Z in the asset faces forward; the game uses -Z.
   const fy=wing?-(z+.3)*.8:(y-3)*.55;
   let fz=wing?-.3+(y-3)*.8:z+Math.max(0,y-3)*.6;
   if(group.name==='leg')fz-=Math.max(0,2.6-y)*.48;
   positions.setXYZ(i,-x*1.5,fy*1.5,-fz*1.5);
  }
  geo.computeVertexNormals();
  const pivot=group===wings[0].outer?wings[0].shoulder.position:group===wings[1].outer?wings[1].shoulder.position:group.position;
  geo.translate(-pivot.x,-pivot.y,-pivot.z);
  if(geo.index){const flat=geo.toNonIndexed();geo.dispose();geo=flat;}
  let materials=buckets.get(group);if(!materials)buckets.set(group,materials=new Map());
  if(!materials.has(mesh.material))materials.set(mesh.material,[]);materials.get(mesh.material).push(geo);
 });
 for(const [group,materials] of buckets)for(const [material,geometries] of materials){
  const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
  if(!geometry)throw new Error('Dragon geometry could not be merged');
  group.add(new THREE.Mesh(geometry,material));
 }
 // Keep the jaw attached when the neck follows the flight direction.
 root.updateMatrixWorld(true);neck.attach(jaw);
 const mouth=new THREE.Object3D();mouth.position.set(0,1.8,-4);root.add(mouth);neck.attach(mouth);
 root.userData.rig={wings,tail:[tail],legs,neck,jaw,mouth,scarf:null,ancient:false,referenceStyle:true};
 return root;
}

export async function installImportedDragon(target){
 try{
  assetPromise ||= new GLTFLoader().loadAsync(modelUrl).catch(error=>{assetPromise=null;throw error;});
  const asset=await assetPromise;
  if(target.userData.disposed)return;
  const replacement=prepareImportedDragon(asset.scene);
  // The rider is added by the caller and remains attached to the same root.
  const anatomy=target.userData.originalAnatomy;
  for(const child of anatomy){child.traverse(o=>o.geometry?.dispose());target.remove(child);}
  delete target.userData.originalAnatomy;
  for(const child of [...replacement.children])target.add(child);
  target.userData.rig=replacement.userData.rig;target.name=replacement.name;
  target.dispatchEvent({type:'model-ready'});
 }catch(error){console.warn('Player model load failed; using the built-in dragon.',error);}
}

export function loadPlayerModel(target){
 target.userData.originalAnatomy=[...target.children];
 return installImportedDragon(target);
}
