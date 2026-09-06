import { MathUtils, Vector3, Matrix4, Quaternion } from 'three';

export function courseAt(time){
 return {x:Math.sin(time*.105)*6+Math.sin(time*.047)*3,y:7+Math.sin(time*.14)*1.1};
}

// WASD offsets the automatic rail independently of the mouse reticle.
export function stepSteering(control,keys,dt){
 let dx=control.touchX??(Number(keys.has('KeyD'))-Number(keys.has('KeyA')));
 let dy=control.touchY??(Number(keys.has('KeyW'))-Number(keys.has('KeyS')));
 const magnitude=Math.hypot(dx,dy);if(magnitude>1){dx/=magnitude;dy/=magnitude;}
 control.steerX=dx?MathUtils.clamp(control.steerX+dx*dt*1.65,-1,1):MathUtils.damp(control.steerX,0,3.2,dt);
 control.steerY=dy?MathUtils.clamp(control.steerY+dy*dt*1.65,-1,1):MathUtils.damp(control.steerY,0,3.2,dt);
}

export function aimPixels(control,width,height){
 return {x:width*(.5+control.steerX*.34),y:height*(.48-control.steerY*.32)};
}

export const VIEW_DIRECTIONS={KeyE:{yaw:-Math.PI/2},KeyQ:{yaw:Math.PI/2}};

export function updateView(camera,view,route,control,dt){
 const difference=view.targetYaw-view.yaw;
 view.yaw+=difference*(1-Math.exp(-9*dt));
 const forward=new Vector3(-Math.sin(view.yaw),0,-Math.cos(view.yaw));
 const right=new Vector3(Math.cos(view.yaw),0,-Math.sin(view.yaw));
 const center=new Vector3(route.x,route.y,3);
 const anchor=center.clone().addScaledVector(right,control.steerX*1.5);
 camera.position.copy(anchor).addScaledVector(forward,-21);camera.position.y+=5+control.steerY*.65;
 camera.lookAt(center.clone().addScaledVector(forward,103).add(new Vector3(0,5,0)));camera.updateMatrixWorld();
 return {forward,right,center};
}

// North on the radar always means forward along the course (-world Z).
export function radarContact(position,origin,range=180){
 const dx=position.x-origin.x,dz=position.z-origin.z,distance=Math.hypot(dx,dz);
 return {x:.5+dx/range*.43,y:.5+dz/range*.43,distance,visible:distance<=range,behind:dz>8};
}

export function reticleWorldPoint(camera,control,width,height,distance=230){
 return new Vector3(control.x/width*2-1,1-control.y/height*2,.5)
  .unproject(camera).sub(camera.position).normalize().multiplyScalar(distance).add(camera.position);
}

export function turnTowardAim(dragon,camera,aim,dt){
 // A -Z-forward look rotation aims the whole body at the actual sight ray.
 // Banking is applied around local Z afterwards, preserving that aim direction.
 const relative=aim.clone().sub(dragon.position).normalize().applyQuaternion(camera.quaternion.clone().invert());
 const bank=-MathUtils.clamp(relative.x/.6,-1,1)*.38;
 const desired=new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(dragon.position,aim,new Vector3(0,1,0)));
 desired.multiply(new Quaternion().setFromAxisAngle(new Vector3(0,0,1),bank));
 dragon.quaternion.slerp(desired,1-Math.exp(-11*dt));
 dragon.userData.aimBank=MathUtils.damp(dragon.userData.aimBank||0,bank,8,dt);
}
