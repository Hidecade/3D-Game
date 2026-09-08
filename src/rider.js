import * as THREE from 'three';

const cloth=new THREE.MeshStandardMaterial({color:0x466d78,roughness:.9});
const leather=new THREE.MeshStandardMaterial({color:0x573e2c,roughness:.85});
const skin=new THREE.MeshStandardMaterial({color:0xf2cbb9,roughness:.62});
const hair=new THREE.MeshStandardMaterial({color:0xc9a45e,roughness:.49});
const hairLight=new THREE.MeshStandardMaterial({color:0xf4dfa0,roughness:.46});
const brow=new THREE.MeshStandardMaterial({color:0x86613b,roughness:.85});
const eyeWhite=new THREE.MeshStandardMaterial({color:0xf8eee4,roughness:.5});
const iris=new THREE.MeshStandardMaterial({color:0x477fa8,roughness:.38});
const pupil=new THREE.MeshStandardMaterial({color:0x172431,roughness:.4});
const lips=new THREE.MeshStandardMaterial({color:0xc5857f,roughness:.75});
const metal=new THREE.MeshStandardMaterial({color:0x5d7277,roughness:.46,metalness:.6});
const glow=new THREE.MeshStandardMaterial({color:0xc0ffff,emissive:0x72eaf5,emissiveIntensity:2});
function oval(g,m,x,y,z,sx,sy,sz){const o=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);g.add(o);return o;}
function hairStrand(group,points,radius,material){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),steps=24,sides=7;
 const geometry=new THREE.TubeGeometry(curve,steps,radius,sides,false),position=geometry.attributes.position;
 for(let i=0;i<=steps;i++){
  const center=curve.getPointAt(i/steps),taper=1-Math.pow(i/steps,1.8)*.94;
  for(let j=0;j<=sides;j++){const index=i*(sides+1)+j,p=new THREE.Vector3().fromBufferAttribute(position,index).sub(center).multiplyScalar(taper).add(center);position.setXYZ(index,p.x,p.y,p.z);}
 }
 geometry.computeVertexNormals();group.add(new THREE.Mesh(geometry,material));
}
function box(g,m,x,y,z,w,h,d){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);g.add(o);return o;}
function limb(g,m,a,b,r){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),direction=q.clone().sub(p);const o=new THREE.Mesh(new THREE.CylinderGeometry(r*.8,r,direction.length(),8),m);o.position.copy(p).add(q).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());g.add(o);}

export function createRider(){
 const root=new THREE.Group();root.name='female-dragon-rider';root.position.set(0,.7,-.65);
 oval(root,leather,0,0,0,.37,.12,.55);box(root,leather,0,.15,.35,.58,.28,.13);
 const hips=new THREE.Group();hips.position.y=.16;root.add(hips);
 oval(hips,leather,0,0,0,.22,.16,.24);
 for(const s of [-1,1]){
  limb(hips,cloth,[s*.15,0,0],[s*.39,-.21,.04],.12);
  limb(hips,cloth,[s*.39,-.21,.04],[s*.43,-.58,.16],.09);
  oval(hips,leather,s*.43,-.62,.09,.09,.13,.2);
 }
 const torso=new THREE.Group();torso.position.y=.14;hips.add(torso);
 oval(torso,cloth,0,.27,0,.235,.34,.2);oval(torso,leather,0,.4,.01,.25,.12,.21);
 oval(torso,leather,0,.04,0,.2,.065,.21);
 box(torso,leather,-.12,.27,-.18,.07,.51,.06);
 oval(torso,skin,0,.65,0,.069,.105,.068);
 const head=new THREE.Group();head.position.set(0,.82,-.035);torso.add(head);
 // Adult oval face, a tapered chin and a softer hairline around the forehead.
 const face=oval(head,skin,0,.01,0,.148,.205,.137);
 const facePositions=face.geometry.attributes.position;
 for(let i=0;i<facePositions.count;i++){
  const y=facePositions.getY(i),jaw=THREE.MathUtils.smoothstep(-y,.15,.95);
  facePositions.setX(i,facePositions.getX(i)*(1-jaw*.2));
 }
 face.geometry.computeVertexNormals();
 oval(head,hair,0,.135,.035,.166,.12,.151);
 for(const side of [-1,1]){
  oval(head,skin,side*.149,-.015,.015,.025,.047,.027);
  oval(head,hair,side*.142,.015,.05,.033,.155,.09);
  const lock=oval(head,hairLight,side*.106,.108,-.087,.038,.119,.03);lock.rotation.z=side*.4;
 }
 const fringe=oval(head,hairLight,-.028,.161,-.096,.11,.038,.045);fringe.rotation.z=-.3;
 const hairLocks=[];
 for(let i=0;i<9;i++){
  const x=(i-4)*.035,lock=new THREE.Group();lock.position.set(x,.09,.13);head.add(lock);
  const bend=Math.sin(i*1.7)*.035,length=.91+Math.cos(i*.65)*.12;
  hairStrand(lock,[[0,0,0],[x*.16,-.2,.055],[bend,-.46,.17],[-bend,-.7,.35],[bend*.5,-length,.48]],i%2?.037:.043,i%3===1?hairLight:hair);
  hairLocks.push(lock);
 }
 for(const side of [-1,1]){
  const lock=new THREE.Group();lock.position.set(side*.127,.065,-.025);head.add(lock);
  hairStrand(lock,[[0,0,0],[side*.025,-.16,-.035],[side*.04,-.32,.015],[side*.022,-.53,.12]],.026,hairLight);hairLocks.push(lock);
 }
 // Small nose bridge and defined blue eyes, with brows separate from the hair.
 oval(head,skin,0,.003,-.133,.016,.047,.022);
 oval(head,skin,0,-.031,-.154,.02,.017,.021);
 for(const side of [-1,1]){const lip=oval(head,lips,side*.013,-.084,-.129,.022,.006,.009);lip.rotation.z=side*-.14;}
 oval(head,lips,0,-.094,-.13,.032,.008,.01);
 for(const side of [-1,1]){
  const eye=oval(head,eyeWhite,side*.061,.035,-.126,.033,.013,.013);eye.rotation.z=side*.12;
  oval(head,iris,side*.06,.035,-.139,.012,.012,.004);
  oval(head,pupil,side*.06,.035,-.143,.005,.008,.002);
  oval(head,eyeWhite,side*.06-.003,.04,-.146,.003,.003,.001);
  const lid=oval(head,brow,side*.063,.047,-.134,.034,.003,.004);lid.rotation.z=side*.13;
  const eyebrow=oval(head,brow,side*.064,.074,-.12,.033,.004,.006);eyebrow.rotation.z=side*.12;
 }
 const weapon=new THREE.Group();weapon.position.set(0,.48,-.07);torso.add(weapon);
 // Both hands and the weapon elevate together while the torso turns at the waist.
 limb(weapon,cloth,[.24,0,0],[.34,-.16,-.28],.085);
 limb(weapon,skin,[.34,-.16,-.28],[.2,-.04,-.47],.065);
 limb(weapon,cloth,[-.24,0,0],[-.22,-.16,-.3],.085);
 limb(weapon,skin,[-.22,-.16,-.3],[.1,-.03,-.65],.06);
 box(weapon,metal,.16,0,-.57,.19,.19,.55);box(weapon,leather,.16,-.14,-.4,.12,.28,.14);
 limb(weapon,metal,[.16,0,-.72],[.16,0,-1.05],.065);
 oval(weapon,glow,.16,0,-1.07,.06,.06,.035);
 const muzzle=new THREE.Object3D();muzzle.position.set(.16,0,-1.12);weapon.add(muzzle);
 root.userData.rig={hips,torso,head,weapon,muzzle,hairLocks,hairTime:0,yaw:0,pitch:0};return root;
}

export function animateRider(root,target,dt){
 animateRiderHair(root,undefined,dt);
 root.updateWorldMatrix(true,true);
 const local=root.worldToLocal(target.clone()).sub(new THREE.Vector3(0,.78,0));
 const desiredYaw=-Math.atan2(local.x,-local.z),rig=root.userData.rig;
 const delta=Math.atan2(Math.sin(desiredYaw-rig.yaw),Math.cos(desiredYaw-rig.yaw));
 rig.yaw+=delta*(1-Math.exp(-15*dt));
 rig.pitch=THREE.MathUtils.damp(rig.pitch,THREE.MathUtils.clamp(Math.atan2(local.y,Math.hypot(local.x,local.z)),-.8,.8),15,dt);
 // Hips pivot in the saddle; the upper body completes the backward glance.
 rig.hips.rotation.y=rig.yaw*.65;rig.torso.rotation.y=rig.yaw*.35;
 // Aim independently of the mount's banking and the waist's slower turn.
 rig.torso.updateWorldMatrix(true,true);
 const torsoTarget=rig.torso.worldToLocal(target.clone());
 for(const part of [rig.weapon,rig.head]){
  part.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(part.position,torsoTarget,new THREE.Vector3(0,1,0)));
 }
}

export function animateRiderHair(root,time,dt=1/60){
 const rig=root.userData.rig;rig.hairTime=time??rig.hairTime+Math.max(0,dt);
 for(let i=0;i<rig.hairLocks.length;i++){
  const lock=rig.hairLocks[i],phase=rig.hairTime*2.5-i*.42;
  lock.rotation.x=-.08+Math.sin(phase)*.035;
  lock.rotation.z=Math.sin(phase*.8)*.045+Math.sin(rig.yaw)*.08;
 }
}

export function riderMuzzle(root){root.updateWorldMatrix(true,true);return root.userData.rig.muzzle.getWorldPosition(new THREE.Vector3());}
export function resetRider(root){const rig=root.userData.rig;rig.yaw=rig.pitch=rig.hairTime=0;for(const part of [rig.hips,rig.torso,rig.head,rig.weapon,...rig.hairLocks])part.rotation.set(0,0,0);}
