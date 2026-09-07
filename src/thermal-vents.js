import * as THREE from 'three';
import { seaHeight } from './warships.js';

// Soft, irregular steam density instead of a solid geometric column.
const steamSize=64,steamPixels=new Uint8Array(steamSize*steamSize*4);
const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
function noise(x,y){
 const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
 return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),u),THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),u),v);
}
for(let y=0;y<steamSize;y++)for(let x=0;x<steamSize;x++){
 const nx=x/(steamSize-1)*2-1,ny=y/(steamSize-1)*2-1;
 const turbulence=noise(x*.12,y*.12)*.6+noise(x*.31,y*.31)*.28+noise(x*.63,y*.63)*.12;
 const edge=Math.max(0,1-Math.hypot(nx,ny)*(1.05+(turbulence-.5)*.5));
 const index=(y*steamSize+x)*4,shade=195+50*turbulence;
 steamPixels[index]=shade;steamPixels[index+1]=shade+3;steamPixels[index+2]=Math.min(255,shade+7);steamPixels[index+3]=255*Math.pow(edge,1.35)*(.35+turbulence*.65);
}
const steamTexture=new THREE.DataTexture(steamPixels,steamSize,steamSize);steamTexture.colorSpace=THREE.SRGBColorSpace;steamTexture.magFilter=steamTexture.minFilter=THREE.LinearFilter;steamTexture.needsUpdate=true;

export function createThermalVents(scene){
 const vents=[],schedule=[16,24,46,56];let next=0;
 function remove(vent){
  const geometries=new Set(),materials=new Set();
  vent.root.traverse(o=>{if(o.geometry&&!o.isSprite)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());vent.root.removeFromParent();
 }
 function reset(){vents.forEach(remove);vents.length=0;next=0;}
 function spawn(x,z){
  const root=new THREE.Group();root.position.set(x,-2,z);scene.add(root);
  const warningMat=new THREE.MeshBasicMaterial({color:0xff5933,transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false});
  const ring=new THREE.Mesh(new THREE.RingGeometry(2.5,3.4,32),warningMat);ring.rotation.x=-Math.PI/2;ring.position.y=.18;root.add(ring);
  const plume=new THREE.Group();root.add(plume);plume.visible=false;
  const clouds=[];
  for(let i=0;i<28;i++){
   const cloud=new THREE.Sprite(new THREE.SpriteMaterial({map:steamTexture,color:i%5===0?0xffd7b0:0xe9f1f1,transparent:true,opacity:0,depthWrite:false}));
   plume.add(cloud);clouds.push(cloud);
  }
  const sprayPositions=new THREE.Float32BufferAttribute(new Float32Array(48*3),3);
  const sprayGeometry=new THREE.BufferGeometry();sprayGeometry.setAttribute('position',sprayPositions);
  const spray=new THREE.Points(sprayGeometry,new THREE.PointsMaterial({color:0xe0f5fa,size:.16,transparent:true,opacity:.75,depthWrite:false}));spray.frustumCulled=false;plume.add(spray);
  const ripples=[];
  for(let i=0;i<2;i++){
   const ripple=new THREE.Mesh(new THREE.RingGeometry(.92,1,48),new THREE.MeshBasicMaterial({color:0xc5e6e8,transparent:true,opacity:.3,side:THREE.DoubleSide,depthWrite:false}));
   ripple.rotation.x=-Math.PI/2;ripple.position.y=.22+i*.03;plume.add(ripple);ripples.push(ripple);
  }
  vents.push({root,ring,plume,clouds,sprayPositions,ripples,age:0,hit:false,erupted:false,height:0});
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
     const p=((v.age*.64+j/28)%1),angle=j*2.4+v.age*1.4;
     const spread=.25+p*1.6,cloud=v.clouds[j];
     cloud.position.set(Math.sin(angle)*spread+Math.sin(p*7+v.age)*p*.5,.2+p*11,Math.cos(angle)*spread);
     const size=2+p*4.5;cloud.scale.set(size,size*(1.1+p*.35),1);
     cloud.material.rotation=angle*.3;
     cloud.material.opacity=Math.sin(p*Math.PI)*(.55+.15*Math.sin(j*4))*strength;
    }
    for(let j=0;j<48;j++){
     const age=(v.age+j*.071)%1.05,angle=j*2.39996,radius=.5+age*(2+j%4*.4);
     v.sprayPositions.setXYZ(j,Math.cos(angle)*radius,Math.max(.05,(8+j%5)*age-9*age*age),Math.sin(angle)*radius);
    }
    v.sprayPositions.needsUpdate=true;
    v.ripples.forEach((r,j)=>{const p=(v.age*.8+j*.5)%1;r.scale.setScalar(2+p*4);r.material.opacity=(1-p)*.4*strength;});
    const dx=player.x-v.root.position.x,dz=player.z-v.root.position.z,dy=player.y-v.root.position.y;
    if(!v.hit&&dx*dx+dz*dz<3.5*3.5&&dy>=0&&dy<v.height+.7){v.hit=true;onHit();}
   }
   if(v.age>=7.2){remove(v);vents.splice(i,1);}
  }
 }
 return {reset,update,vents};
}
