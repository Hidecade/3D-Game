import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { prepareImportedDragon } from '../src/imported-dragon.js';
import { animateDragon, dragonMouth } from '../src/dragons.js';

// Load the actual GLB geometry; image decoding is left to browser verification.
const bytes=fs.readFileSync(new URL('../assets/models/player-dragon.glb',import.meta.url));
const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length));
json.materials=json.materials.map(m=>({name:m.name,pbrMetallicRoughness:{baseColorFactor:m.pbrMetallicRoughness?.baseColorFactor||[1,1,1,1]}}));
json.buffers[0].uri='data:application/octet-stream;base64,'+bytes.subarray(28+length).toString('base64');
globalThis.ProgressEvent=class {constructor(type,data){Object.assign(this,data);}};
const asset=await new GLTFLoader().parseAsync(JSON.stringify(json),'');
const model=prepareImportedDragon(asset.scene),rig=model.userData.rig;
assert.equal(rig.wings.length,2);assert.equal(rig.legs.length,4);
for(const wing of rig.wings)assert.ok(wing.outer.children.length,'both wings contain the supplied mesh');
for(const leg of rig.legs)assert.ok(leg.joint.children.length,'all limbs contain supplied geometry');
let meshes=0;model.traverse(o=>{if(o.isMesh){meshes++;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));}});
assert.ok(meshes<60,`batched draw count: ${meshes}`);
const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
assert.ok(size.x>15&&size.x<20,'wings fit player scale');
assert.ok(dragonMouth(model).z<0,'head faces forward');
for(let i=0;i<90;i++)animateDragon(model,i/60,{motion:new THREE.Vector3(1,.2,0)});
assert.ok(rig.wingMotion.effort>.4);assert.ok(rig.tail[0].rotation.y<0,'tail trails turning direction');
assert.ok(rig.legs.every(l=>l.joint.rotation.z>.2));
console.log(`PASS: actual GLB geometry, flight pose, ${meshes} batched meshes, articulated wings/tail/legs.`);
