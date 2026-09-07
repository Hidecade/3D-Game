import * as THREE from 'three';

const cloth=new THREE.MeshStandardMaterial({color:0x466d78,roughness:.9});
const leather=new THREE.MeshStandardMaterial({color:0x573e2c,roughness:.85});
const skin=new THREE.MeshStandardMaterial({color:0xf0c8b0,roughness:.72});
const hair=new THREE.MeshStandardMaterial({color:0xc39a49,roughness:.65});
const hairLight=new THREE.MeshStandardMaterial({color:0xf2d582,roughness:.62});
const brow=new THREE.MeshStandardMaterial({color:0x86613b,roughness:.85});
const eyeWhite=new THREE.MeshStandardMaterial({color:0xf8eee4,roughness:.5});
const iris=new THREE.MeshStandardMaterial({color:0x477fa8,roughness:.38});
const pupil=new THREE.MeshStandardMaterial({color:0x172431,roughness:.4});
const lips=new THREE.MeshStandardMaterial({color:0xc5857f,roughness:.75});
const metal=new THREE.MeshStandardMaterial({color:0x5d7277,roughness:.46,metalness:.6});
const glow=new THREE.MeshStandardMaterial({color:0xc0ffff,emissive:0x72eaf5,emissiveIntensity:2});
function oval(g,m,x,y,z,sx,sy,sz){const o=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);g.add(o);return o;}
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
 const head=new THREE.Group();head.position.set(0,.82,-.035);torso.add(head);
 // Adult oval face, a tapered chin and a softer hairline around the forehead.
 oval(head,skin,0,.01,0,.151,.2,.145);
 oval(head,skin,0,-.118,-.015,.098,.078,.105);
 oval(head,hair,0,.135,.035,.166,.12,.151);
 for(const side of [-1,1]){
  oval(head,skin,side*.149,-.015,.015,.025,.047,.027);
  oval(head,hair,side*.142,.015,.05,.033,.155,.09);
  const lock=oval(head,hairLight,side*.106,.108,-.087,.038,.119,.03);lock.rotation.z=side*.4;
 }
 const fringe=oval(head,hairLight,-.028,.161,-.096,.11,.038,.045);fringe.rotation.z=-.3;
 const ponytail=new THREE.Group();ponytail.position.set(0,.09,.17);head.add(ponytail);
 oval(ponytail,leather,0,0,.035,.065,.065,.065);
 for(let i=0;i<5;i++){
  const x=(i-2)*.026;
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,0,.035),new THREE.Vector3(x*.9,-.1,.21),new THREE.Vector3(x*1.3,-.3,.31),new THREE.Vector3(x*.6,-.51,.23)]);
  ponytail.add(new THREE.Mesh(new THREE.TubeGeometry(curve,14,i%2?.025:.034,7,false),i%2?hairLight:hair));
  oval(ponytail,hairLight,x*.6,-.51,.23,.017,.055,.018);
 }
 // Small nose bridge and defined blue eyes, with brows separate from the hair.
 oval(head,skin,0,.005,-.141,.019,.052,.027);
 oval(head,skin,0,-.03,-.16,.025,.022,.028);
 oval(head,lips,0,-.095,-.128,.043,.012,.012);
 oval(head,skin,0,-.117,-.12,.039,.014,.012);
 for(const side of [-1,1]){
  oval(head,eyeWhite,side*.062,.035,-.132,.034,.016,.017);
  oval(head,iris,side*.06,.035,-.149,.013,.014,.005);
  oval(head,pupil,side*.06,.035,-.154,.006,.009,.002);
  oval(head,eyeWhite,side*.06-.004,.04,-.156,.003,.004,.002);
  const lid=oval(head,brow,side*.064,.051,-.139,.033,.004,.006);lid.rotation.z=side*.1;
  const eyebrow=oval(head,brow,side*.064,.078,-.127,.036,.006,.008);eyebrow.rotation.z=side*.12;
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
 root.userData.rig={hips,torso,head,weapon,muzzle,yaw:0,pitch:0};return root;
}

export function animateRider(root,target,dt){
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

export function riderMuzzle(root){root.updateWorldMatrix(true,true);return root.userData.rig.muzzle.getWorldPosition(new THREE.Vector3());}
export function resetRider(root){const rig=root.userData.rig;rig.yaw=rig.pitch=0;for(const part of [rig.hips,rig.torso,rig.head,rig.weapon])part.rotation.set(0,0,0);}
