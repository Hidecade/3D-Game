import * as THREE from 'three';

const slices=12,sides=7;
function tube(){
 const geometry=new THREE.BufferGeometry(),indices=[];
 geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array((slices+1)*(sides+1)*3),3));
 for(let i=0;i<slices;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j;indices.push(a,a+1,a+sides+1,a+1,a+sides+2,a+sides+1);}
 geometry.setIndex(indices);return geometry;
}

export function createLaser(curved=false){
 const group=new THREE.Group();group.name=curved?'homing-laser':'mouth-laser';
 const layers=[];
 for(const [radius,color,opacity] of [[curved?.12:.065,0xf0ffff,1],[curved?.38:.22,0x58eaff,.3]]){
  const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(tube(),material);mesh.frustumCulled=false;group.add(mesh);layers.push({mesh,radius,opacity});
 }
 const flare=new THREE.Mesh(new THREE.SphereGeometry(curved?.18:.11,10,6),new THREE.MeshBasicMaterial({color:0xb9ffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));group.add(flare);
 return {group,layers,flare,curved};
}

export function updateLaser(laser,origin,end,{alpha=1,lane=0,time=0,points=null}={}){
 const direction=end.clone().sub(origin),length=direction.length();
 const bend=laser.curved&&!points;
 const curve=points&&points.length>2?new THREE.CatmullRomCurve3(points):new THREE.CubicBezierCurve3(origin,
  origin.clone().addScaledVector(direction,.28).add(new THREE.Vector3(bend?((lane%2?1:-1)*(4+lane*.6)):0,bend?4+lane*.8:0,0)),
  origin.clone().addScaledVector(direction,.68).add(new THREE.Vector3(bend?Math.sin(time*3+lane)*3:0,bend?2:0,0)),end);
 for(const {mesh,radius,opacity} of laser.layers){
  const positions=mesh.geometry.attributes.position;
  for(let i=0;i<=slices;i++){
   const p=curve.getPoint(i/slices),tangent=curve.getTangent(i/slices).normalize();
   const normal=new THREE.Vector3().crossVectors(tangent,Math.abs(tangent.y)>.95?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0)).normalize();
   const binormal=new THREE.Vector3().crossVectors(tangent,normal).normalize();
   for(let j=0;j<=sides;j++){const angle=j/sides*Math.PI*2;const q=p.clone().addScaledVector(normal,Math.cos(angle)*radius).addScaledVector(binormal,Math.sin(angle)*radius);positions.setXYZ(i*(sides+1)+j,q.x,q.y,q.z);}
  }
  positions.needsUpdate=true;mesh.material.opacity=opacity*alpha;mesh.visible=length>.01;
 }
 laser.flare.position.copy(end);laser.flare.material.opacity=alpha;laser.flare.scale.setScalar(.85+Math.sin(time*35)*.15);
}

export function disposeLaser(laser){laser.group.traverse(mesh=>{mesh.geometry?.dispose();mesh.material?.dispose();});laser.group.removeFromParent();}
