import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { galleryModels } from './gallery-models.js';

const $=id=>document.getElementById(id),canvas=$('gallery-canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xe6f5ff,0x405465,2.7));
for(const [color,intensity,x,y,z] of [[0xffdeb7,3,8,12,10],[0x83c8ff,2,-10,4,-8]]){const light=new THREE.DirectionalLight(color,intensity);light.position.set(x,y,z);scene.add(light);}
const camera=new THREE.PerspectiveCamera(40,1,.01,500);
const orbit=new OrbitControls(camera,canvas);orbit.enableDamping=true;orbit.enablePan=false;orbit.autoRotate=true;orbit.autoRotateSpeed=.8;
const holder=new THREE.Group();scene.add(holder);
let selected=0,model,center=new THREE.Vector3(),baseDistance=15,clock=0;
function frameSize(){const rect=canvas.parentElement.getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();}
function resetView(){
 const limitingFov=Math.min(camera.fov*Math.PI/180,2*Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect));
 baseDistance=6/Math.sin(limitingFov/2)*1.15;
 camera.position.set(.7,.3,-1).normalize().multiplyScalar(baseDistance);orbit.target.set(0,0,0);orbit.minDistance=baseDistance/2.5;orbit.maxDistance=baseDistance/.55;orbit.update();$('zoom').value=1;
}
function select(index){
 selected=(index+galleryModels.length)%galleryModels.length;
 if(model){const geometries=new Set();model.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());holder.remove(model);}
 holder.scale.setScalar(1);holder.updateMatrixWorld(true);
 const item=galleryModels[selected];model=item.create();holder.add(model);clock=0;
 const bounds=new THREE.Box3().setFromObject(model);bounds.getCenter(center);
 const radius=bounds.getSize(new THREE.Vector3()).length()/2;
 holder.scale.setScalar(6/Math.max(radius,.01));model.position.sub(center);holder.position.set(0,0,0);
 $('model-select').value=String(selected);$('model-counter').textContent=`${String(selected+1).padStart(2,'0')} / ${String(galleryModels.length).padStart(2,'0')}`;
 $('model-name').textContent=item.name;$('model-description').textContent=item.description;resetView();
}
galleryModels.forEach((item,index)=>{const option=document.createElement('option');option.value=index;option.textContent=item.name;$('model-select').append(option);});
$('model-select').onchange=e=>select(Number(e.target.value));$('previous-model').onclick=()=>select(selected-1);$('next-model').onclick=()=>select(selected+1);
$('auto-rotate').onclick=()=>{orbit.autoRotate=!orbit.autoRotate;$('auto-rotate').ariaPressed=String(orbit.autoRotate);$('auto-rotate').textContent=`自動回転 ${orbit.autoRotate?'ON':'OFF'}`;};
$('reset-view').onclick=resetView;
$('zoom').oninput=e=>{camera.position.sub(orbit.target).setLength(baseDistance/Number(e.target.value)).add(orbit.target);orbit.update();};
orbit.addEventListener('change',()=>{$('zoom').value=String(THREE.MathUtils.clamp(baseDistance/camera.position.distanceTo(orbit.target),.55,2.5));});
new ResizeObserver(()=>{frameSize();resetView();}).observe(canvas.parentElement);frameSize();select(0);
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.04,(now-last)/1000);last=now;if(document.hidden)return;clock+=dt;galleryModels[selected].animate?.(model,clock);orbit.update(dt);renderer.render(scene,camera);}
requestAnimationFrame(frame);
