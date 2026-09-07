import * as THREE from 'three';
import { createDragon, animateDragon, dragonMouth } from './dragons.js';
import { createSkyBeast } from './sky-beasts.js';
import { createSkyInsect, animateSkyInsect } from './sky-insects.js';
import { createOcean } from './ocean.js';
import { courseAt, stepSteering, aimPixels, reticleWorldPoint, turnTowardAim, VIEW_DIRECTIONS, updateView, radarContact } from './flight.js';
import { createCentipede, animateCentipede } from './centipede.js';
import { createLaser, updateLaser, disposeLaser } from './lasers.js';
import { createWarship, updateWarship, warshipMuzzle, seaHeight } from './warships.js';
import { createRider, animateRider, riderMuzzle, resetRider } from './rider.js';
import { createSoundEffects } from './sound-effects.js';
import { createMusic } from './music.js';
import { installTouchControls } from './touch-controls.js';
import { installUpdatePrompt } from './update-check.js';

const $ = id => document.getElementById(id);
installUpdatePrompt();
const canvas = $('world');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#99c8cc');
scene.fog = new THREE.FogExp2('#9ac5c5', .0039);
const camera = new THREE.PerspectiveCamera(56, innerWidth / innerHeight, .1, 1500);
camera.position.set(0, 12, 24); camera.lookAt(0, 12, -100);
scene.add(new THREE.HemisphereLight('#e7f2e4', '#24515a', 2.7));
const sun = new THREE.DirectionalLight('#fff0cb', 3.2); sun.position.set(-90, 150, -180); scene.add(sun);
const materials = {};
function mat(color, extra={}) { const key=color+JSON.stringify(extra); return materials[key] ||= new THREE.MeshStandardMaterial({color, roughness:.83,...extra}); }
function mesh(geo, material, x=0,y=0,z=0,parent=scene) { const m = new THREE.Mesh(geo, material); m.position.set(x,y,z); parent.add(m); return m; }
function box(w,h,d,material,x,y,z,parent) {return mesh(new THREE.BoxGeometry(w,h,d),material,x,y,z,parent);}
function ellipsoid(x,y,z,sx,sy,sz,material,parent){const m=mesh(new THREE.SphereGeometry(1,12,8),material,x,y,z,parent);m.scale.set(sx,sy,sz);return m;}
function rod(a,b,r,material,parent){ const d=new THREE.Vector3().subVectors(b,a);const m=mesh(new THREE.CylinderGeometry(r*.65,r,d.length(),7),material,0,0,0,parent);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
let seed=171;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}

// Displaced waves with real scene reflections, small ripples, and crest foam.
const ocean=createOcean();scene.add(ocean);
const seaMaterial=ocean.material;
let travel=0;
const sunOrb=mesh(new THREE.SphereGeometry(24,24,16),new THREE.MeshBasicMaterial({color:'#fff0cb'}),-220,215,-1000);
// Clouds and distant islands are geometry, so the entire vista has real depth.
const cloudMat=mat('#e4e5d6',{transparent:true,opacity:.3,depthWrite:false});
for(let i=0;i<34;i++){const c=ellipsoid((rand()-.5)*1500,100+rand()*100,-350-rand()*700,45+rand()*70,3+rand()*7,15+rand()*25,cloudMat,scene);c.rotation.z=(rand()-.5)*.1;}
const stone=[mat('#b4b59d'),mat('#c3c2a7'),mat('#a2aa94'),mat('#ccc8aa')];
const darkStone=mat('#596f64');
const ruins=[];
function makeRuin(x,z,scale=1,arch=true){
 const g=new THREE.Group();g.position.set(x,-3,z);g.scale.setScalar(scale);scene.add(g);
 const h=24+rand()*25;
 box(24,4,15,darkStone,0,1,0,g);
 for(const side of [-1,1]){
  const ph=arch?h:h*(.4+rand()*.6);
  box(7,ph,8,stone[0],side*10,ph/2,0,g);
  box(9,2,10,stone[2],side*10,ph*.25,0,g);box(9,2,10,stone[1],side*10,ph*.76,0,g);
  for(let j=0;j<4;j++)box(.3,ph*.63,.32,stone[2],side*10-2.3+j*1.5,ph*.48,4.05,g);
  box(10,2.6,11,stone[1],side*10,ph,0,g);
 }
 if(arch){
  const arc=mesh(new THREE.TorusGeometry(10,3.4,6,22,Math.PI),stone[1],0,h,0,g);
  for(let j=0;j<9;j++){const a=j/8*Math.PI;const brick=box(2.1,1,8.5,stone[2],Math.cos(a)*10,h+Math.sin(a)*10,0,g);brick.rotation.z=a-Math.PI/2;}
 }
 for(let j=0;j<7;j++){const b=box(3+rand()*5,3+rand()*8,4+rand()*5,stone[j%4],(rand()-.5)*34,rand()*3,(rand()-.5)*22,g);b.rotation.set(rand()*.3,rand()*2,rand()*.25);}
 ruins.push(g);return g;
}
makeRuin(48,-105,1.65);makeRuin(-73,-180,1.4);makeRuin(115,-300,2.1);
for(let i=0;i<27;i++)makeRuin((i%2?1:-1)*(45+rand()*160),-220-i*49,.5+rand()*1.6,rand()>.34);
for(let i=0;i<34;i++){
 const g=new THREE.Group();scene.add(g);g.position.set((i%2?1:-1)*(95+rand()*340),-7,-100-rand()*1300);
 const rock=mesh(new THREE.IcosahedronGeometry(1,1),darkStone,0,0,0,g);rock.scale.set(28+rand()*55,12+rand()*22,22+rand()*55);ruins.push(g);
}

// Articulated player dragon.
const dragon=createDragon({referenceStyle:true});scene.add(dragon);
const rider=createRider();dragon.add(rider);

let mode='title', t=0, elapsed=0, health=100, score=0, kills=0, combo=0, lastKill=-99, waveTimer=2, shotTimer=0, lockTimer=0, invulnerable=0, boss=null, bossSpawned=false, announcementTime=0;
let stageTime=0,midBoss=null,midBossSpawned=false;
const lasers=[];
const enemies=[], bullets=[], effects=[], locks=new Set(), keys=new Set();
const control={x:innerWidth*.5,y:innerHeight*.48,steerX:0,steerY:0,shooting:false,locking:false};
try{control.invertY=localStorage.getItem('azure-relic-invert-y')==='true';}catch{control.invertY=false;}
function refreshInvertButton(){
 $('invert-y').textContent=`上下反転 ${control.invertY?'ON':'OFF'}`;
 $('invert-y').ariaPressed=String(control.invertY);
}
$('invert-y').onclick=()=>{
 control.invertY=!control.invertY;refreshInvertButton();
 try{localStorage.setItem('azure-relic-invert-y',String(control.invertY));}catch{}
};
refreshInvertButton();
const player={x:0,y:7};
const view={yaw:0,targetYaw:0,label:'前方'},radarDots=new Map();
let ambushTimer=12,ambushWave=0;
let shipTimer=8,shipWave=0;
let audioContext, soundOn=true;
const music=createMusic();
const se=createSoundEffects(()=>audioContext ||= new AudioContext());
se.setEnabled(soundOn);
function tone(freq,duration=.1,type='sine',volume=.035,end=freq){
 if(!soundOn||audioContext?.state!=='running')return;
 const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type;o.frequency.setValueAtTime(freq,audioContext.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),audioContext.currentTime+duration);g.gain.setValueAtTime(volume,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+duration);o.connect(g).connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+duration);
}
function announce(text,duration=4){$('announcement').textContent=text;announcementTime=duration;$('announcement').style.opacity=1;}
function screenPos(pos){const p=pos.clone().project(camera);return {x:(p.x*.5+.5)*innerWidth,y:(-.5*p.y+.5)*innerHeight,visible:p.z>-1&&p.z<1&&Math.abs(p.x)<1.2&&Math.abs(p.y)<1.2};}
function disposeGroup(g){g.traverse(o=>{if(o.geometry)o.geometry.dispose();});g.removeFromParent();}
function createEnemy(x,y,z,isBoss=false,approach='front',insect=false){
 const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);
 const creature=isBoss?createDragon({kind:'ancient',ancient:true}):insect?createSkyInsect():createSkyBeast({kind:rand()>.5?'amber':'storm'});
 creature.rotation.y=approach==='front'?Math.PI:0;creature.scale.setScalar(isBoss?2.65:.73);g.add(creature);
 const e={mesh:g,creature,hp:isBoss?220:3,maxHp:isBoss?220:3,boss:isBoss,insect:!isBoss&&insect,approach,age:0,baseX:x,baseY:y,baseZ:z,sideOffset:x-courseAt(elapsed).x,fire:2+rand()*2,phase:rand()*6,dead:false,marker:null};enemies.push(e);return e;
}
function spawnAmbush(){
 const side=['rear','left','right'][ambushWave++%3],route=courseAt(elapsed);
 for(let i=0;i<3;i++){
  if(side==='rear')createEnemy(route.x+(i-1)*10,9+i*2,112+i*12,false,'rear',i===1);
  else createEnemy(route.x+(side==='left'?-1:1)*(60+i*12),9+i*2,3+(i-1)*13,false,side,i===1);
 }
 announce(side==='rear'?'後方から敵接近 / Q / E で旋回':side==='left'?'左側から敵接近 / レーダーを確認':'右側から敵接近 / レーダーを確認',4);
}
function spawnWarship(x,z){
 const g=new THREE.Group();g.position.set(x,-1,z);scene.add(g);
 const model=createWarship();model.rotation.y=Math.PI;g.add(model);
 const e={mesh:g,creature:model,warship:true,hp:1,maxHp:1,hitRadius:3.5,age:0,baseX:x,phase:rand()*6,fire:3,dead:false,marker:null};
 enemies.push(e);updateWarship(model,g.position,dragon.position,t,travel,0);return e;
}
function updateShip(e,dt){
 e.age+=dt;e.fire-=dt;e.mesh.position.z+=dt*12;e.mesh.position.x=e.baseX+Math.sin(e.age*.18+e.phase)*2;
 updateWarship(e.creature,e.mesh.position,dragon.position,t,travel,dt);
 const distance=e.mesh.position.distanceTo(dragon.position);
 if(e.fire<=0&&distance<125&&distance>12){se.play('shipShot');launchBolt(warshipMuzzle(e.creature),dragon.position.clone(),'#ffcb79',true);e.fire=3.8;}
 if(e.mesh.position.z>200){e.dead=true;locks.delete(e);e.marker?.remove();}
}
function renderRadar(){
 let rear=0;const active=new Set();
 for(const e of enemies){
  if(e.dead)continue;const p=radarContact(e.mesh.position,dragon.position);if(!p.visible)continue;
  active.add(e);if(p.behind)rear++;
  let dot=radarDots.get(e);if(!dot){dot=document.createElement('i');$('radar-markers').append(dot);radarDots.set(e,dot);}
  dot.className='radar-dot'+(p.behind?' behind':'')+(e.boss||e.midBoss?' large':'')+(e.warship?' surface':'')+(locks.has(e)?' locked':'');
  dot.style.left=`${p.x*100}%`;dot.style.top=`${p.y*100}%`;
 }
 for(const [e,dot] of radarDots)if(!active.has(e)){dot.remove();radarDots.delete(e);}
 $('radar-cone').style.transform=`rotate(${-view.yaw*180/Math.PI}deg)`;
 $('view-label').textContent=view.label;
 $('rear-warning').textContent=rear?`後方に ${rear} 体 / Q / E で旋回・迎撃`:'後方クリア';$('rear-warning').classList.toggle('danger',rear>0);
}
function spawnMidBoss(){
 const model=createCentipede();scene.add(model);
 midBoss={model,hp:180,maxHp:180,age:0,fire:3,dead:false,targets:[]};midBossSpawned=true;
 model.userData.segments.forEach(({mesh},index)=>{
  const target={mesh,midBoss,head:index===0,hp:index===0?180:10,maxHp:index===0?180:10,hitRadius:index===0?2.7:1.9,dead:false,marker:null};
  midBoss.targets.push(target);enemies.push(target);
 });
 $('boss-bar').hidden=false;$('boss-name').textContent='MIDBOSS / 天翔百足 ヴェルミス';$('boss-health').style.width='100%';
 announce('WARNING / 天翔百足 ヴェルミス — 体節をロックして破壊',6);se.play('summon');
}
function damageMidBoss(target,amount){
 const enemy=target.midBoss;if(enemy.dead||target.dead)return;
 enemy.hp=Math.max(0,enemy.hp-amount);target.hp-=amount;burst(target.mesh.position,'#ffd895',4);
 $('boss-health').style.width=`${enemy.hp/enemy.maxHp*100}%`;
 if(enemy.hp===0){
  enemy.dead=true;
  for(const part of enemy.targets){if(!part.dead)burst(part.mesh.position,'#ffc080',10);part.dead=true;locks.delete(part);part.marker?.remove();}
  score+=2500;kills++;updateScore();$('boss-bar').hidden=true;
  announce('中ボス撃破 / 聖域への航路を再開',4);se.play('largeExplosion');waveTimer=3;
 }else if(!target.head&&target.hp<=0){
  target.dead=true;locks.delete(target);target.marker?.remove();burst(target.mesh.position,'#ffc080',14);
  score+=150;updateScore();se.play('smallExplosion');
 }
}
function updateMidBoss(dt){
 if(!midBoss||midBoss.dead)return;
 midBoss.age+=dt;midBoss.fire-=dt;animateCentipede(midBoss.model,midBoss.age);
 if(midBoss.fire<=0){
  se.play('bossVolley');
  const head=midBoss.targets[0].mesh,origin=head.localToWorld(V(0,0,2.5));
  for(const offset of [-3,0,3])launchBolt(origin.clone(),dragon.position.clone().add(V(offset,0,0)),'#ffb36c',true);
  // Surviving body sections add a slower aimed shot between head volleys.
  const part=midBoss.targets[1+Math.floor(midBoss.age)%15];
  if(!part.dead)launchBolt(part.mesh.position.clone(),dragon.position.clone(),'#ffc774',true);
  midBoss.fire=2.3;
 }
}
function updateScore(){ $('score').textContent=String(score).padStart(6,'0');$('combo').textContent=combo>1?`${combo} CHAIN / ${Math.min(combo,8)}× BONUS`:'TARGET DESTROYED'; }
function burst(pos,color='#ffd19b',count=18){
 for(let i=0;i<count;i++){const m=mesh(new THREE.IcosahedronGeometry(.12+rand()*.25,0),mat(color,{emissive:color,emissiveIntensity:1.6}),pos.x,pos.y,pos.z);effects.push({mesh:m,velocity:V((rand()-.5)*20,(rand()-.5)*20,(rand()-.5)*20),life:.5+rand()*.5,max:1});}
}
function damageEnemy(e,amount){if(e.dead)return;if(e.midBoss){damageMidBoss(e,amount);return;}e.hp-=amount;burst(e.mesh.position,'#a9edee',3);if(e.boss)$('boss-health').style.width=`${Math.max(0,e.hp/e.maxHp)*100}%`;if(e.hp<=0){e.dead=true;locks.delete(e);e.marker?.remove();if(!e.boss){breakEnemy(e);burst(e.mesh.position,'#ffc080',20);se.play(e.warship?'mediumExplosion':'smallExplosion');}combo=elapsed-lastKill<3?combo+1:1;lastKill=elapsed;kills++;score+=(e.boss?5000:e.warship?600:100)*Math.min(combo,8);updateScore();if(e.boss)beginBossCrash(e);}}
function launchBolt(origin,target,color,enemy=false,homing=null,damage=1){
 const boltColor=enemy?'#ff2415':color;
 const m=mesh(new THREE.SphereGeometry(enemy?.43:.14,10,8),mat(boltColor,{emissive:boltColor,emissiveIntensity:enemy?1.6:3}),origin.x,origin.y,origin.z);
 if(enemy){
  mesh(new THREE.SphereGeometry(.66,10,8),mat('#e8170b',{emissive:'#e8170b',emissiveIntensity:1.2,transparent:true,opacity:.35,depthWrite:false}),0,0,0,m);
  const flame=mesh(new THREE.ConeGeometry(.4,2.25,9),mat('#e51b0b',{emissive:'#ff1808',emissiveIntensity:1.4,transparent:true,opacity:.8,depthWrite:false}),0,0,-1.05,m);flame.rotation.x=-Math.PI/2;
  m.userData.flame=flame;
  m.lookAt(target);
 }else {m.scale.setScalar(1.8);m.lookAt(target);}
 const vel=target.clone().sub(origin).normalize().multiplyScalar(enemy?26:180);bullets.push({mesh:m,velocity:vel,enemy,homing,damage,life:enemy?9:2.2});
}
function laserAim(){
 let nearest=null,best=Infinity;
 for(const e of enemies){if(e.dead)continue;const p=screenPos(e.mesh.position);const dist=Math.hypot(p.x-control.x,p.y-control.y);const radius=e.boss?100:e.midBoss?40:e.warship?40:Math.max(25,1000/Math.max(1,camera.position.distanceTo(e.mesh.position)));if(p.visible&&dist<radius&&dist<best){nearest=e;best=dist;}}
 const aim=reticleWorldPoint(camera,control,innerWidth,innerHeight);
 return {target:nearest,end:nearest?nearest.mesh.position.clone():aim};
}
function launchLaser(target,end,homing=false,lane=0){
 const visual=createLaser(homing),position=Math.cos(view.targetYaw)>.999&&Math.cos(view.yaw)>.9?dragonMouth(dragon):riderMuzzle(rider),direction=end.clone().sub(position).normalize();
 if(homing)direction.add(V((lane%2?1:-1)*.28,.16,0)).normalize();
 scene.add(visual.group);
 const laser={visual,target,position,velocity:direction.multiplyScalar(homing?62:70),speed:homing?62:70,damage:homing?7:1,homing,lane,life:6,trail:[position.clone()],length:homing?7:4.5};
 updateLaser(visual,position,position,{alpha:0});lasers.push(laser);
}
function shoot(){
 if(shotTimer>0)return;shotTimer=.15;
 const {target,end}=laserAim();launchLaser(target,end);se.play('laser');
}
function updateHomingLasers(dt){
 for(let i=lasers.length-1;i>=0;i--){
  const laser=lasers[i],previous=laser.position.clone();laser.life-=dt;
  if(laser.target&&!laser.target.dead){
   const desired=laser.target.mesh.position.clone().sub(laser.position).normalize().multiplyScalar(laser.speed);
   laser.velocity.lerp(desired,1-Math.exp(-(laser.homing?7:10)*dt)).normalize().multiplyScalar(laser.speed);
  }
  laser.position.addScaledVector(laser.velocity,dt);
  // Test the travelled tip segment, so damage occurs only when the light arrives.
  if(mode==='playing'){
   const line=new THREE.Line3(previous,laser.position);let hit=null,nearest=Infinity;
   const candidates=laser.homing?(laser.target&&!laser.target.dead?[laser.target]:[]):enemies;
   for(const e of candidates){
    if(e.dead)continue;const closest=line.closestPointToPoint(e.mesh.position,true,V(0,0,0));
    const radius=e.hitRadius||(e.boss?5:2);
    if(closest.distanceTo(e.mesh.position)<radius){const distance=previous.distanceToSquared(closest);if(distance<nearest){hit=e;nearest=distance;}}
   }
   if(hit){damageEnemy(hit,laser.damage);laser.life=0;}
  }
  if(laser.life<=0){disposeLaser(laser.visual);lasers.splice(i,1);continue;}
  laser.trail.push(laser.position.clone());
  let remaining=laser.length;const points=[laser.position.clone()];
  for(let j=laser.trail.length-2;j>=0;j--){
   const next=laser.trail[j],last=points[points.length-1],distance=last.distanceTo(next);
   if(distance>remaining){points.push(last.clone().lerp(next,remaining/distance));break;}
   points.push(next.clone());remaining-=distance;
  }
  points.reverse();laser.trail=points;
  updateLaser(laser.visual,points[0],laser.position,{time:elapsed,points,alpha:Math.min(1,laser.life/.25)});
 }
}
function releaseLocks(){
 if(mode==='playing'&&locks.size){
  const targets=[...locks].filter(e=>!e.dead);clearLocks();
  targets.forEach((target,lane)=>launchLaser(target,target.mesh.position.clone(),true,lane));
  se.play('homing');
 }else clearLocks();
}
function clearLocks(){for(const e of locks){e.marker?.remove();e.marker=null;}locks.clear();control.locking=false;$('reticle').classList.remove('locking');}
function hurt(){if(invulnerable>0||mode!=='playing')return;health=Math.max(0,health-10);invulnerable=1.5;$('health').style.width=`${health}%`;$('hp-label').textContent=`${health}%`;$('flash').style.opacity=.35;se.play('damage');combo=0;if(!health)finish(false);}
function reset(){
 document.body.classList.remove('ending');victoryTime=0;bossCrash=null;dragon.visible=true;
 touch.reset();
 music.start(true,'stage');
 delete dragon.userData.rig.wingMotion;
 se.stopAll();se.setSuspended(false);void se.unlock();
 resetRider(rider);
 shipTimer=8;shipWave=0;
 view.yaw=view.targetYaw=0;view.label='前方';ambushTimer=12;ambushWave=0;for(const dot of radarDots.values())dot.remove();radarDots.clear();
 for(const laser of lasers)disposeLaser(laser.visual);lasers.length=0;
 for(const e of enemies){e.marker?.remove();disposeGroup(e.mesh);}enemies.length=0;
 if(midBoss)disposeGroup(midBoss.model);midBoss=null;midBossSpawned=false;stageTime=0;
 for(const b of bullets)disposeGroup(b.mesh);bullets.length=0;for(const e of effects)disposeGroup(e.mesh);effects.length=0;
 clearLocks();keys.clear();clearMovementTap();control.shooting=false;$('flash').style.opacity=0;t=elapsed=travel=0;seaMaterial.uniforms.travel.value=0;control.steerX=control.steerY=0;Object.assign(control,aimPixels(control,innerWidth,innerHeight));health=100;score=kills=combo=0;lastKill=-99;waveTimer=2;shotTimer=lockTimer=invulnerable=0;boss=null;bossSpawned=false;player.x=0;player.y=7;dragon.position.set(0,7,3);dragon.rotation.set(0,0,0);dragon.userData.aimBank=0;dragon.userData.rig.neck.rotation.set(0,0,0);camera.position.set(0,12,24);camera.lookAt(0,12,-100);camera.updateMatrixWorld();
 $('health').style.width='100%';$('hp-label').textContent='100%';$('score').textContent='000000';$('combo').textContent='READY TO ENGAGE';$('boss-bar').hidden=true;$('boss-health').style.width='100%';$('overlay').hidden=true;$('title').hidden=true;$('location').hidden=true;$('footer').hidden=true;$('hud').hidden=false;document.body.classList.add('playing');mode='playing';announce('EPISODE 01  /  水没した聖域',5);
}
function pause(){if(mode==='playing'){touch.reset();music.pause();se.setSuspended(true);mode='paused';control.shooting=false;clearLocks();keys.clear();clearMovementTap();$('overlay').hidden=false;$('result-label').textContent='FLIGHT PAUSED';$('result-title').textContent='飛行を一時停止';$('result-copy').textContent='翼を休めて、再び空へ。';$('resume').hidden=false;}else if(mode==='paused'){music.start();se.setSuspended(false);void se.unlock();mode='playing';$('overlay').hidden=true;}}
function finish(win){if(win&&mode!=='victory'){beginVictory();return;}touch.reset();music.pause();invulnerable=0;$('flash').style.opacity=0;if(win){$('progress').style.width='100%';$('distance').textContent='100%';}mode=win?'win':'lose';control.shooting=false;clearLocks();$('overlay').hidden=false;$('result-label').textContent=win?'EPISODE COMPLETE':'FLIGHT LOST';$('result-title').textContent=win?'聖域に、静寂を。':'翼は、まだ折れていない。';$('result-copy').textContent=`${win?'守護者を撃破。蒼い空は、再びあなたのものに。':'もう一度、竜とともに聖域へ。'}\nSCORE  ${String(score).padStart(6,'0')}   /   撃破 ${kills}   /   ${Math.floor(elapsed)} 秒`;$('resume').hidden=true;document.body.classList.remove('playing');}
let victoryTime=0,bossCrash=null;
function beginBossCrash(enemy){
 beginVictory();mode='boss-crash';
 bossCrash={enemy,age:0,impactAge:0,impacted:false};
 camera.position.copy(enemy.mesh.position).add(V(30,14,45));
 camera.lookAt(enemy.mesh.position);camera.updateMatrixWorld();
}
function throwDebris(part,origin,label){
 part.updateWorldMatrix(true,true);
 const center=new THREE.Box3().setFromObject(part).getCenter(V(0,0,0));
 const chunk=new THREE.Group();chunk.position.copy(center);scene.add(chunk);chunk.attach(part);
 chunk.name=label;
 const direction=center.clone().sub(origin);direction.y=0;
 if(direction.lengthSq()<.01)direction.set(rand()-.5,0,rand()-.5);
 direction.normalize().multiplyScalar(7+rand()*9);direction.y=6+rand()*9;
 effects.push({mesh:chunk,velocity:direction,spin:V((rand()-.5)*5,(rand()-.5)*5,(rand()-.5)*5),gravity:15,life:2.4,max:2.4,debris:true});
}
function breakEnemy(e){
 const origin=e.mesh.position.clone(),rig=e.creature.userData.rig;
 if(e.warship){
  // Reuse the boat's textured wood and iron materials for recognizable wreckage.
  const wood=rig.body.children.find(o=>o.isMesh&&o.material.map)?.material;
  const iron=rig.turret.children.find(o=>o.isMesh)?.material;
  e.creature.updateWorldMatrix(true,true);
  for(let i=0;i<24;i++){
   const metal=i>=18;
   const piece=new THREE.Mesh(new THREE.BoxGeometry(metal?.45:.25,.18,metal?.7:1.5+rand()*2.5),metal?iron:wood);
   piece.position.set((rand()-.5)*4,1+rand(),(rand()-.5)*13);
   e.creature.add(piece);
   throwDebris(piece,origin,metal?'iron-debris':'wood-debris');
  }
  throwDebris(rig.turret,origin,'turret-debris');
 }else{
  for(const wing of rig.wings)throwDebris(wing.shoulder,origin,'wing-debris');
  if(rig.tail[0])throwDebris(rig.tail[0],origin,'tail-debris');
  throwDebris(e.creature,origin,'body-debris');
 }
}
function updateBossCrash(dt){
 if(document.hidden)return;
 t+=dt;seaMaterial.uniforms.time.value=t;
 const crash=bossCrash,body=crash.enemy.mesh;
 crash.age+=dt;
 animateDragon(dragon,t);
 updateHomingLasers(dt);
 if(!crash.impacted){
  body.position.y-=(2+crash.age*9)*dt;
  body.position.z+=dt*3;
  body.rotation.x-=dt*.35;body.rotation.z+=dt*.65;
  camera.lookAt(body.position);camera.updateMatrixWorld();
  const surface=seaHeight(body.position.x,body.position.z,t,travel);
  if(body.position.y<=surface+1){
   body.position.y=surface;crash.impacted=true;
   burst(body.position,'#ffe2ad',85);se.play('largeExplosion');
   for(let i=0;i<55;i++){
    const angle=rand()*Math.PI*2,speed=8+rand()*16;
    const drop=mesh(new THREE.SphereGeometry(.25+rand()*.45,6,4),mat('#c3f5ff',{transparent:true,opacity:.8}),body.position.x,surface,body.position.z);
    effects.push({mesh:drop,velocity:V(Math.cos(angle)*speed,8+rand()*17,Math.sin(angle)*speed),life:2,max:2});
   }
   disposeGroup(body);
   const index=enemies.indexOf(crash.enemy);if(index>=0)enemies.splice(index,1);
  }
 }else{
  crash.impactAge+=dt;
  if(crash.impactAge>=1.8){bossCrash=null;beginVictory();}
 }
}
function beginVictory(){
 mode='victory';victoryTime=0;touch.reset();keys.clear();clearMovementTap();control.shooting=false;clearLocks();invulnerable=0;dragon.visible=true;
 $('flash').style.opacity=0;$('overlay').hidden=true;$('hud').hidden=true;
 document.body.classList.remove('playing');document.body.classList.add('ending');
 for(const bullet of bullets)disposeGroup(bullet.mesh);bullets.length=0;
 camera.position.copy(dragon.position).add(V(0,5,21));camera.lookAt(dragon.position.clone().add(V(0,3,-50)));camera.updateMatrixWorld();
}
function updateVictory(dt){
 if(document.hidden)return;
 victoryTime+=dt;t+=dt;seaMaterial.uniforms.time.value=t;
 const velocity=V(4+victoryTime*9,2+victoryTime*12,-8-victoryTime*9);
 dragon.position.addScaledVector(velocity,dt);
 const destination=dragon.position.clone().add(velocity.clone().multiplyScalar(5));
 turnTowardAim(dragon,camera,destination,dt);
 animateDragon(dragon,t,{bank:dragon.userData.aimBank,motion:V(.45,.9,0),aimTarget:destination,dt});
 animateRider(rider,destination,dt);updateHomingLasers(dt);
 if(victoryTime>=4){dragon.visible=false;finish(true);}
}
$('start').onclick=()=>{reset();if(soundOn)tone(330,.7);};$('restart').onclick=reset;$('resume').onclick=pause;$('pause').onclick=pause;
$('sound').onclick=()=>{soundOn=!soundOn;music.setEnabled(soundOn);se.setEnabled(soundOn);if(soundOn)void se.unlock();$('sound').textContent=soundOn?'SOUND ON':'SOUND OFF';if(soundOn)tone(440,.2);};
let movementTap={code:null,upAt:-Infinity,downCode:null,downAt:null};
function clearMovementTap(){movementTap={code:null,upAt:-Infinity,downCode:null,downAt:null};}
function handleKeyDown(e){
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(e.code))e.preventDefault();
 if(e.repeat&&['Enter','Escape','KeyM','KeyR'].includes(e.code))return;
 if(e.code==='Enter'){
  if(mode==='title'||mode==='win'||mode==='lose')reset();else if(mode==='paused')pause();
  document.activeElement?.blur();return;
 }
 if(e.code==='Escape'){pause();return;}
 if(e.code==='KeyM'){$('sound').onclick();return;}
 if(mode!=='playing')return;
 if((e.code==='KeyA'||e.code==='KeyD')&&!e.repeat&&!keys.has(e.code)){
  const now=Date.now(),opposite=e.code==='KeyA'?'KeyD':'KeyA';
  if(keys.has(opposite))clearMovementTap();
  else{
   const twice=movementTap.code===e.code&&now-movementTap.upAt<=320;
   clearMovementTap();movementTap.downCode=e.code;movementTap.downAt=twice?null:now;
   if(twice)handleKeyDown({code:e.code==='KeyA'?'KeyQ':'KeyE',repeat:false,preventDefault(){}});
  }
 }
 if(soundOn&&audioContext?.state!=='running')void se.unlock();
 const direction=e.code==='KeyR'?{yaw:Math.round(view.yaw/(Math.PI*2))*Math.PI*2-view.targetYaw}:VIEW_DIRECTIONS[e.code];
 if(direction){
  if(!e.repeat){
   view.targetYaw+=direction.yaw;
   const sector=((Math.round(-view.targetYaw/(Math.PI/2))%4)+4)%4;
   view.label=['前方','右側','後方','左側'][sector];
   clearLocks();control.steerX=control.steerY=0;Object.assign(control,aimPixels(control,innerWidth,innerHeight));
  }
  return;
 }
 keys.add(e.code);
}
function handleKeyUp(e){
 if(keys.has(e.code)&&movementTap.downCode===e.code){
  const now=Date.now();
  if(mode==='playing'&&movementTap.downAt!==null&&now-movementTap.downAt<=220){movementTap.code=e.code;movementTap.upAt=now;}
  else{movementTap.code=null;movementTap.upAt=-Infinity;}
  movementTap.downCode=null;movementTap.downAt=null;
 }
 keys.delete(e.code);
}
function moveAim(e){
 if(mode!=='playing'||e.pointerType==='touch')return;
 control.x=THREE.MathUtils.clamp(e.clientX,12,innerWidth-12);
 control.y=THREE.MathUtils.clamp(e.clientY,12,innerHeight-12);
}
window.addEventListener('pointermove',moveAim);
window.addEventListener('pointerdown',e=>{
 if(e.pointerType==='touch')return;
 if(mode!=='playing'||e.target?.closest?.('button,a')||![0,2].includes(e.button))return;
 e.preventDefault();moveAim(e);if(soundOn)void se.unlock();
 if(e.button===0){control.shooting=true;shoot();}
 if(e.button===2){clearLocks();control.locking=true;}
});
window.addEventListener('pointerup',e=>{
 if(e.pointerType==='touch')return;
 if(e.button===0)control.shooting=false;
 if(e.button===2){if(mode==='playing'&&control.locking)releaseLocks();else clearLocks();}
});
window.addEventListener('pointercancel',e=>{if(e.pointerType!=='touch'){control.shooting=false;clearLocks();}});
window.addEventListener('pointerout',e=>{if(e.pointerType!=='touch'&&!e.relatedTarget){control.shooting=false;clearLocks();}});
window.addEventListener('contextmenu',e=>{if(mode==='playing'&&!e.target?.closest?.('button,a'))e.preventDefault();});
window.addEventListener('keydown',handleKeyDown);
window.addEventListener('keyup',handleKeyUp);
window.addEventListener('blur',()=>{if(mode==='playing')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pause();});
const touch=installTouchControls({control,playing:()=>mode==='playing',turn:code=>handleKeyDown({code,repeat:false,preventDefault(){}}),fire:shoot,lock:()=>{clearLocks();control.locking=true;},release:releaseLocks,cancel:()=>{control.shooting=false;clearLocks();},unlock:()=>{if(soundOn)void se.unlock();}});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

function updateGameplay(dt){
 elapsed+=dt;shotTimer-=dt;lockTimer-=dt;invulnerable-=dt;announcementTime-=dt;if(announcementTime<0)$('announcement').style.opacity=0;
 if(!midBoss||midBoss.dead)stageTime+=dt;
 const previousSteerX=control.steerX,previousSteerY=control.steerY;
 stepSteering(control,keys,dt);
 const route=courseAt(elapsed),basis=updateView(camera,view,route,control,dt);
 const position=basis.center.clone().addScaledVector(basis.right,control.steerX*12);
 position.y=Math.max(3.35,route.y+control.steerY*4.2);player.x=position.x;player.y=position.y;player.z=position.z;
 dragon.position.lerp(position,1-Math.exp(-dt*4));
 const flightAim=reticleWorldPoint(camera,control,innerWidth,innerHeight);
 const forwardView=Math.cos(view.targetYaw)>.999&&Math.cos(view.yaw)>.9;
 const ahead=courseAt(elapsed+3);
 const dragonAim=forwardView?flightAim:V(ahead.x,ahead.y,-100);
 // Looking sideways/back changes the rider's aim, never the dragon's course.
 if(forwardView)turnTowardAim(dragon,camera,dragonAim,dt);
 else{dragon.userData.aimBank=THREE.MathUtils.damp(dragon.userData.aimBank||0,0,10,dt);const desired=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(dragon.position,dragonAim,V(0,1,0)));dragon.quaternion.slerp(desired,1-Math.exp(-12*dt));}
 const wingMotion=basis.right.clone().multiplyScalar((control.steerX-previousSteerX)/Math.max(dt*1.65,.0001));
 wingMotion.y=(control.steerY-previousSteerY)/Math.max(dt*1.65,.0001);
 wingMotion.applyQuaternion(dragon.quaternion.clone().invert());
 animateDragon(dragon,t,{bank:dragon.userData.aimBank,breathing:control.shooting&&forwardView,aimTarget:dragonAim,motion:wingMotion,dt});
 animateRider(rider,flightAim,dt);
 if(control.shooting)shoot();
 dragon.visible=invulnerable<=0||Math.floor(invulnerable*14)%2===0;
 $('reticle').style.left=`${control.x}px`;$('reticle').style.top=`${control.y}px`;$('reticle').classList.toggle('locking',control.locking);
 if(stageTime>=32&&!midBossSpawned)spawnMidBoss();
 updateMidBoss(dt);
 if((!midBoss||midBoss.dead)&&stageTime<66){
  shipTimer-=dt;if(shipTimer<=0){const side=shipWave++%2?1:-1;spawnWarship(route.x+side*22,-140);if(shipWave===1){spawnWarship(route.x+25,-190);announce('旧時代の小型戦艦 / 水面の砲台を撃破',4);}shipTimer=19;}
 }
 if((!midBoss||midBoss.dead)&&stageTime<66){ambushTimer-=dt;if(ambushTimer<=0){spawnAmbush();ambushTimer=14;}}
 if(!midBoss||midBoss.dead)waveTimer-=dt;
 if(stageTime<66&&waveTimer<=0&&(!midBoss||midBoss.dead)){const wave=Math.floor(stageTime/6);const count=3+Math.min(3,Math.floor(stageTime/20));for(let j=0;j<count;j++)createEnemy((j-(count-1)/2)*9+Math.sin(wave)*8,9+Math.sin(j*1.7+wave)*6,-125-j*10,false,'front',j%3===1);waveTimer=6; if(wave===3)announce('右クリック長押しで捕捉 → 離してホーミングレーザー');}
 if(stageTime>=70&&!bossSpawned){bossSpawned=true;music.start(true,'boss');boss=createEnemy(0,17,-155,true);$('boss-bar').hidden=false;$('boss-name').textContent='ANCIENT DRAGON / 古竜アシュガル';$('boss-health').style.width='100%';announce('WARNING  /  聖域の守護者 接近',5);se.play('bossWarning');}
 const progress=Math.min(100,Math.min(stageTime/70,1)*80+(boss?((boss.maxHp-boss.hp)/boss.maxHp)*20:0));$('distance').textContent=`${Math.floor(progress)}%`;$('progress').style.width=`${progress}%`;
 for(const e of enemies){
  if(e.dead)continue;
  if(e.warship){updateShip(e,dt);if(e.dead)continue;}
  else if(!e.midBoss){e.age+=dt;e.fire-=dt;if(e.insect)animateSkyInsect(e.creature,e.age+e.phase);else animateDragon(e.creature,e.age+e.phase,{bank:Math.cos(e.age),breathing:e.fire<.45});
  if(e.boss){e.mesh.position.z=THREE.MathUtils.lerp(e.mesh.position.z,-60,dt*.4);e.mesh.position.x=Math.sin(e.age*.38)*17;e.mesh.position.y=16+Math.sin(e.age*.7)*5;e.mesh.rotation.z=Math.sin(e.age*.38)*-.1;}
  else{
   if(e.approach==='left'||e.approach==='right'){
    // Match course speed and stay in a separate flank lane, then peel away.
    const side=e.approach==='left'?-1:1,departure=Math.max(0,e.age-16);
    e.mesh.position.x=route.x+side*(Math.max(48,Math.abs(e.sideOffset))+Math.sin(e.age*.65+e.phase)*2+departure*18);
    e.mesh.position.z=e.baseZ+Math.sin(e.age*.7+e.phase)*3-departure*10;
   }
   else{e.mesh.position.z+=dt*(e.approach==='rear'?-12:15+stageTime*.05);e.mesh.position.x=e.baseX+Math.sin(e.age*1.3+e.phase)*5;}
   e.mesh.position.y=e.baseY+Math.sin(e.age*1.8+e.phase)*2;e.mesh.rotation.z=Math.cos(e.age*1.3+e.phase)*.18;
  }
  const enemyDistance=e.mesh.position.distanceTo(dragon.position);
  if(e.fire<=0&&enemyDistance>10&&enemyDistance<135){se.play(e.boss?'bossVolley':'enemyShot');const target=dragon.position.clone(),origin=dragonMouth(e.creature);launchBolt(origin,target,'#ff915d',true);if(e.boss){launchBolt(origin.clone(),target.clone().add(V(-4,0,0)),'#ffb06b',true);launchBolt(origin.clone(),target.clone().add(V(4,0,0)),'#ffb06b',true);}e.fire=e.boss?1.3:3.3;}
  if(!e.boss&&((e.approach==='front'&&e.mesh.position.z>180)||(e.approach==='rear'&&e.mesh.position.z<-160)||((e.approach==='left'||e.approach==='right')&&e.age>20))){e.dead=true;locks.delete(e);e.marker?.remove();continue;}
  }
  const p=screenPos(e.mesh.position);
  if(control.locking&&locks.size<6&&!locks.has(e)&&lockTimer<=0&&p.visible&&Math.hypot(p.x-control.x,p.y-control.y)<(e.boss?140:105)){locks.add(e);e.marker=document.createElement('div');e.marker.className='marker';$('markers').append(e.marker);tone(750+locks.size*140,.09,'sine',.04);lockTimer=.12;}
  if(e.marker){e.marker.style.left=`${p.x}px`;e.marker.style.top=`${p.y}px`;e.marker.hidden=!p.visible;}
 }
 $('locks').textContent=`${locks.size} / 6`;$('lock-dots').textContent=Array.from({length:6},(_,i)=>i<locks.size?'◆':'◇').join(' ');
 updateHomingLasers(dt);
 for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.life-=dt;const prev=b.mesh.position.clone();if(b.homing&&!b.homing.dead){b.velocity.copy(b.homing.mesh.position).sub(b.mesh.position).normalize().multiplyScalar(180);b.mesh.lookAt(b.homing.mesh.position);}b.mesh.position.addScaledVector(b.velocity,dt);
  if(b.enemy){const flame=b.mesh.userData.flame;if(flame){flame.scale.x=flame.scale.z=1+Math.sin(b.life*31)*.12;flame.scale.y=1+Math.sin(b.life*43)*.16;}const segment=new THREE.Line3(prev,b.mesh.position);const closest=segment.closestPointToPoint(dragon.position,true,new THREE.Vector3());if(closest.distanceTo(dragon.position)<1.5){hurt();b.life=0;}}
  else {
   const segment=new THREE.Line3(prev,b.mesh.position);let hit=null,nearest=Infinity;
   for(const e of enemies){if(e.dead)continue;const closest=segment.closestPointToPoint(e.mesh.position,true,V(0,0,0));
    if(closest.distanceTo(e.mesh.position)<(e.hitRadius||(e.boss?5:2))){const distance=prev.distanceToSquared(closest);if(distance<nearest){nearest=distance;hit=e;}}
   }
   if(hit){damageEnemy(hit,b.damage);b.life=0;}
  }
  if(b.life<=0){disposeGroup(b.mesh);bullets.splice(i,1);}
 }
 for(let i=enemies.length-1;i>=0;i--)if(enemies[i].dead&&enemies[i]!==bossCrash?.enemy){disposeGroup(enemies[i].mesh);enemies.splice(i,1);}
 renderRadar();
}
let previous=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.04);previous=now;
 if(mode==='boss-crash')updateBossCrash(dt);
 else if(mode==='victory')updateVictory(dt);
 if(mode==='title'||mode==='playing'){
  t+=dt;seaMaterial.uniforms.time.value=t;
  const speed=mode==='title'?4:23;travel+=dt*speed;seaMaterial.uniforms.travel.value=travel;
  for(const r of ruins){r.position.z+=dt*speed;if(r.position.z>600)r.position.z-=2100;}
  if(mode==='title'){dragon.visible=true;dragon.position.set(6.7+Math.sin(t*.25)*.6,7.8+Math.sin(t*1.3)*.4,-1);dragon.rotation.set(0,0,Math.sin(t*.8)*.025);camera.position.set(0,12,24);camera.lookAt(0,12,-100);animateDragon(dragon,t);}
  else updateGameplay(dt);
 }
 if(mode==='win'||mode==='lose')updateHomingLasers(dt);
 if(mode!=='paused')for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;e.mesh.position.addScaledVector(e.velocity,dt);e.velocity.y-=dt*(e.gravity??5);if(e.spin){e.mesh.rotation.x+=e.spin.x*dt;e.mesh.rotation.y+=e.spin.y*dt;e.mesh.rotation.z+=e.spin.z*dt;}e.mesh.scale.setScalar(Math.max(0,e.debris?Math.min(1,e.life/.5):e.life/e.max));if(e.life<=0){disposeGroup(e.mesh);effects.splice(i,1);}}
 if(invulnerable<1)$('flash').style.opacity=0;
 renderer.render(scene,camera);
}
requestAnimationFrame(frame);
