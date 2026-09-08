import * as THREE from 'three';
import { createAncientPassage } from './ancient-passage.js';

export function createCavePassages(scene){
 const passages=[];let next=0;
 const schedule=[10,42];
 function reset(){
  for(const p of passages)dispose(p);
  passages.length=0;next=0;
 }
 function dispose(p){if(p.dispose)p.dispose();else{p.root.traverse(o=>{o.geometry?.dispose();});p.material.dispose();p.root.removeFromParent();}}
 function spawn(x,ancient=false){
  if(ancient){
   const p=createAncientPassage();p.root.position.set(x,0,-100);scene.add(p.root);
   passages.push({...p,ancient:true,spikes:[],wallHit:false});return;
  }
  const root=new THREE.Group();root.name='narrow-cave-passage';root.position.set(x,0,-100);scene.add(root);
  const material=new THREE.MeshStandardMaterial({color:0x59646b,roughness:.95,side:THREE.DoubleSide,flatShading:true});
  const vertices=[],indices=[],steps=24,sides=24;
  for(let j=0;j<=steps;j++){
   const z=-j*15,edge=Math.min(j*15,360-j*15),blend=THREE.MathUtils.smoothstep(edge,0,60);
   const rx=THREE.MathUtils.lerp(108,25,blend),ry=THREE.MathUtils.lerp(58,20,blend),cy=THREE.MathUtils.lerp(40,16,blend);
   for(let i=0;i<=sides;i++){
    const angle=i/sides*Math.PI*2,rough=1+Math.sin(angle*7+j*.9)*.025*blend;
    vertices.push(Math.cos(angle)*rx*rough,cy+Math.sin(angle)*ry*rough,z);
    if(j<steps&&i<sides){const a=j*(sides+1)+i;indices.push(a,a+1,a+sides+1,a+1,a+sides+2,a+sides+1);}
   }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();root.add(new THREE.Mesh(geometry,material));
  const spikes=[];
  for(const [label,base,tip,radius] of [
   ['left',[-25,10,-85],[-3,10,-85],5],
   ['ceiling',[0,36,-155],[0,10,-155],5.5],
   ['right',[25,9,-225],[3,9,-225],5],
  ]){
   const start=new THREE.Vector3(...base),end=new THREE.Vector3(...tip),axis=end.clone().sub(start),length=axis.length();axis.normalize();
   const rock=new THREE.Mesh(new THREE.ConeGeometry(radius,length,9),material);rock.name=`${label}-rock-spike`;
   rock.position.copy(start).add(end).multiplyScalar(.5);rock.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis);root.add(rock);
   spikes.push({label,start,axis,length,radius,hit:false});
  }
  passages.push({root,material,spikes,wallHit:false});
 }
 function update(dt,{stageTime,routeX,player,enabled=true,onWarning=()=>{},onHit=()=>{}}){
  if(enabled&&next<schedule.length&&stageTime>=schedule[next]){const ancient=next===1;next++;spawn(routeX,ancient);onWarning(ancient);}
  for(let i=passages.length-1;i>=0;i--){
   const p=passages[i];p.root.position.z+=23*dt;
   const local=player.clone().sub(p.root.position);
   for(const spike of p.spikes){
    const relative=local.clone().sub(spike.start),along=relative.dot(spike.axis);
    const radius=spike.radius*(1-THREE.MathUtils.clamp(along/spike.length,0,1));
    if(!spike.hit&&along>=-.7&&along<=spike.length+.7&&relative.addScaledVector(spike.axis,-along).length()<radius+.7){spike.hit=true;onHit();}
   }
   if(local.z<0&&local.z>-360){
    const blend=THREE.MathUtils.smoothstep(Math.min(-local.z,360+local.z),0,60);
    const rx=THREE.MathUtils.lerp(108,25,blend)-.7,ry=THREE.MathUtils.lerp(58,20,blend)-.7,cy=THREE.MathUtils.lerp(40,16,blend);
    const touching=p.ancient?(Math.abs(local.x)>22.3||local.y<2.2||local.y>51||Math.abs(local.x)>18.3&&local.y<5.5):(local.x/rx)**2+((local.y-cy)/ry)**2>1;
    if(touching&&!p.wallHit){p.wallHit=true;onHit();}else if(!touching)p.wallHit=false;
   }
   if(p.root.position.z>470){dispose(p);passages.splice(i,1);}
  }
 }
 return {update,reset,passages};
}
