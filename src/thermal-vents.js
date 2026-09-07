import * as THREE from 'three';
import { seaHeight } from './warships.js';

export function createThermalVents(scene){
 const vents=[],schedule=[16,24,46,56];let next=0;
 function remove(vent){
  const geometries=new Set(),materials=new Set();
  vent.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());vent.root.removeFromParent();
 }
 function reset(){vents.forEach(remove);vents.length=0;next=0;}
 function spawn(x,z){
  const root=new THREE.Group();root.position.set(x,-2,z);scene.add(root);
  const warningMat=new THREE.MeshBasicMaterial({color:0xff5933,transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false});
  const ring=new THREE.Mesh(new THREE.RingGeometry(2.5,3.4,32),warningMat);ring.rotation.x=-Math.PI/2;ring.position.y=.18;root.add(ring);
  const plume=new THREE.Group();root.add(plume);plume.visible=false;
  const gas=new THREE.MeshBasicMaterial({color:0xffba83,transparent:true,opacity:.25,depthWrite:false});
  const core=new THREE.MeshBasicMaterial({color:0xff6635,transparent:true,opacity:.38,depthWrite:false});
  const column=new THREE.Mesh(new THREE.CylinderGeometry(3.4,2.1,12,12,1,true),core);column.position.y=6;plume.add(column);
  const clouds=[];
  const cloudGeometry=new THREE.SphereGeometry(1,8,6);
  for(let i=0;i<8;i++){const cloud=new THREE.Mesh(cloudGeometry,gas);plume.add(cloud);clouds.push(cloud);}
  vents.push({root,ring,plume,clouds,gas,core,age:0,hit:false,erupted:false,height:0});
 }
 function update(dt,{stageTime,routeX,player,time,travel,enabled=true,onWarning=()=>{},onErupt=()=>{},onHit=()=>{}}){
  if(enabled&&next<schedule.length&&stageTime>=schedule[next]){
   const lanes=next%2?[-13,3]:[-4,12];next++;
   for(const lane of lanes)spawn(routeX+lane,-110);
   onWarning();
  }
  for(let i=vents.length-1;i>=0;i--){
   const v=vents[i];v.age+=dt;v.root.position.z+=23*dt;
   v.root.position.y=seaHeight(v.root.position.x,v.root.position.z,time,travel);
   v.ring.scale.setScalar(1+Math.sin(v.age*9)*.08);
   v.ring.material.opacity=.55+Math.sin(v.age*12)*.2;
   const active=v.age>=2.4&&v.age<6.8;
   v.plume.visible=active;
   if(active){
    if(!v.erupted){v.erupted=true;onErupt();}
    const strength=Math.min(1,(v.age-2.4)/.35,(6.8-v.age)/.5);
    v.height=12*strength;v.plume.scale.y=strength;
    for(let j=0;j<v.clouds.length;j++){
     const p=((v.age*1.2+j/8)%1),angle=j*2.4+v.age;
     v.clouds[j].position.set(Math.sin(angle)*p*1.2,p*12,Math.cos(angle)*p*1.2);
     v.clouds[j].scale.set(1.5+p*2,.9+p,1.5+p*2);
    }
    const dx=player.x-v.root.position.x,dz=player.z-v.root.position.z,dy=player.y-v.root.position.y;
    if(!v.hit&&dx*dx+dz*dz<3.5*3.5&&dy>=0&&dy<v.height+.7){v.hit=true;onHit();}
   }
   if(v.age>=7.2){remove(v);vents.splice(i,1);}
  }
 }
 return {reset,update,vents};
}
