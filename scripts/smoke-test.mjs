import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as Three from 'three';
import { createDragon, animateDragon, dragonMouth } from '../src/dragons.js';
import { createSkyBeast } from '../src/sky-beasts.js';
import { createSkyInsect, animateSkyInsect } from '../src/sky-insects.js';
import { createOcean } from '../src/ocean.js';
import { courseAt, stepSteering, aimPixels, reticleWorldPoint, turnTowardAim, VIEW_DIRECTIONS, updateView, radarContact } from '../src/flight.js';
import { createCentipede, animateCentipede } from '../src/centipede.js';
import { createLaser, updateLaser, disposeLaser } from '../src/lasers.js';
import { createWarship, updateWarship, warshipMuzzle, seaHeight } from '../src/warships.js';
import { createRider, animateRider, riderMuzzle, resetRider } from '../src/rider.js';

// Run the real game logic with Three.js geometry and math. Only browser surfaces
// and the GPU renderer are stubbed; this does not replace visual browser QA.
const elements = new Map();
function element(){return {style:{},hidden:false,textContent:'',classList:{add(){},remove(){},toggle(){}},addEventListener(){},append(){},remove(){}};}
class Renderer {setPixelRatio(){}setSize(){}render(scene,camera){scene.updateMatrixWorld();camera.updateMatrixWorld();}}
let currentTrack='stage';const createMusic=()=>({start(restart,track){if(track)currentTrack=track;},pause(){},setEnabled(){}});
const installTouchControls=()=>({reset(){}});
const installUpdatePrompt=()=>{};
const soundEvents=[];let soundEnabled=false,soundUnlocks=0;
const createSoundEffects=()=>({play(name){soundEvents.push(name);},setEnabled(value){soundEnabled=value;},setSuspended(){},stopAll(){},async unlock(){soundUnlocks++;}});
const events=new Map();
const savedSettings=new Map([['azure-relic-invert-y','true']]);
const localStorage={getItem:key=>savedSettings.get(key),setItem:(key,value)=>savedSettings.set(key,value)};
const context=vm.createContext({localStorage,createSkyInsect,animateSkyInsect,createSkyBeast,createDragon,animateDragon,dragonMouth,createOcean,courseAt,stepSteering,aimPixels,reticleWorldPoint,turnTowardAim,VIEW_DIRECTIONS,updateView,radarContact,createCentipede,animateCentipede,createLaser,updateLaser,disposeLaser,createWarship,updateWarship,warshipMuzzle,seaHeight,createRider,animateRider,riderMuzzle,resetRider,createSoundEffects,createMusic,installTouchControls,installUpdatePrompt,THREE:{...Three,WebGLRenderer:Renderer},document:{getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:element,body:element(),addEventListener(){}},window:{addEventListener(name,fn){events.set(name,fn);}},innerWidth:1440,innerHeight:900,devicePixelRatio:1,performance:{now:()=>0},requestAnimationFrame(){},console});
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
vm.runInContext(source+`;globalThis.test={reset,pause,frame,createEnemy,spawnWarship,damageEnemy,shoot,releaseLocks,hurt,keys,control,player,screenPos,dragon,rider,locks,enemies,camera,updateGameplay,get state(){return {effects,view,radarDots,mode,elapsed,stageTime,midBoss,midBossSpawned,health,score,kills,bossSpawned,boss,bullets:bullets.length,projectiles:bullets,laserFlights:lasers,lasers:lasers.length,travel}},setInvulnerable(n){invulnerable=n}}`,context);
const g=context.test;assert.equal(g.control.invertY,true,'saved inversion is restored');elements.get('invert-y').onclick();assert.equal(savedSettings.get('azure-relic-invert-y'),'false');assert.equal(soundEnabled,true,'sound is enabled by default');
// Steering visibly strengthens the stroke, mirrors the wing lean, and settles.
{
 const right=createDragon({referenceStyle:true}),left=createDragon({referenceStyle:true});
 for(let i=0;i<30;i++){
  animateDragon(right,i/60,{motion:new Three.Vector3(1,0,0)});
  animateDragon(left,i/60,{motion:new Three.Vector3(-1,0,0)});
 }
 const rig=right.userData.rig;
 assert.ok(rig.wingMotion.effort>.6,'steering produces a strong stroke');
 assert.equal(rig.legs.length,4,'all four short limbs have joints');
 assert.ok(rig.legs.every(leg=>leg.joint.rotation.z>.25),'legs lean into rightward movement');
 assert.ok(left.userData.rig.legs.every(leg=>leg.joint.rotation.z<-.25),'legs lean into leftward movement');
 assert.ok(rig.wingMotion.tailFlow[0].x>rig.wingMotion.tailFlow.at(-1).x+.2,'tail tip follows root with a delay');
 assert.ok(rig.tail[0].rotation.y<left.userData.rig.tail[0].rotation.y-.15,'tail trails opposite to movement');
 for(let i=0;i<2;i++)assert.ok(Math.abs(rig.wings[i].shoulder.rotation.z+left.userData.rig.wings[1-i].shoulder.rotation.z)<1e-9,'left and right turns mirror the wings');
 animateDragon(right,.5,{motion:new Three.Vector3(-1,1,0)});
 assert.equal(rig.wingMotion.burst,1,'reversing direction triggers a fresh power stroke');
 for(let i=0;i<240;i++)animateDragon(right,.5+i/60,{motion:new Three.Vector3()});
 assert.ok(rig.wingMotion.effort<.001,'cruising returns to gentle flapping');
 assert.ok(rig.legs.every(leg=>Math.abs(leg.joint.rotation.z)<.001),'legs return to neutral');
 assert.ok(Math.abs(rig.wingMotion.tailFlow.at(-1).x)<.001,'tail settles after movement');
}
const press=code=>events.get('keydown')({code,repeat:false,preventDefault(){}});
const release=code=>events.get('keyup')({code});
const mouseDown=(button=0)=>events.get('pointerdown')({button,clientX:g.control.x,clientY:g.control.y,preventDefault(){}});
const mouseUp=(button=0)=>events.get('pointerup')({button});
const mouseMove=(x,y)=>events.get('pointermove')({clientX:x,clientY:y});
g.frame(16);assert.equal(g.state.mode,'title');
press('Enter');assert.equal(g.state.mode,'playing');assert.equal(g.state.health,100);assert.ok(soundUnlocks>0,'keyboard start unlocks SE');press('KeyM');assert.equal(soundEnabled,false);press('KeyM');assert.equal(soundEnabled,true);
press('Escape');assert.equal(g.state.mode,'paused');const pausedTime=g.state.elapsed,pausedTravel=g.state.travel;g.frame(32);assert.equal(g.state.elapsed,pausedTime);assert.equal(g.state.travel,pausedTravel);press('Enter');
g.frame(48);assert.ok(g.state.travel>pausedTravel,'rail advances with no input');
const center=aimPixels({steerX:0,steerY:0},1440,900);
press('KeyD');press('KeyW');g.updateGameplay(.1);assert.ok(g.player.x>courseAt(g.state.elapsed).x);assert.ok(g.player.y>courseAt(g.state.elapsed).y);assert.equal(g.control.x,center.x);assert.equal(g.control.y,center.y);mouseMove(center.x+220,center.y-120);g.updateGameplay(.1);
const route=courseAt(g.state.elapsed),ahead=courseAt(g.state.elapsed+3);
assert.ok(g.dragon.rotation.y < -Math.atan2(ahead.x-route.x,69),'dragon turns toward rightward aim');
assert.ok(g.dragon.rotation.x > Math.atan2(ahead.y-route.y,69),'dragon pitches toward upward aim');release('KeyD');release('KeyW');
for(let i=0;i<180;i++)g.updateGameplay(1/60);assert.equal(g.control.x,center.x+220,'movement does not recenter mouse aim');assert.ok(Math.abs(g.player.x-courseAt(g.state.elapsed).x)<.01,'returns to moving rail');
g.reset();press('KeyJ');press('KeyZ');g.updateGameplay(.1);release('KeyJ');release('KeyZ');assert.equal(g.state.bullets,0);assert.equal(g.state.lasers,0,'old attack keys do nothing');
press('Space');release('Space');assert.equal(g.state.lasers,0,'SPACE no longer attacks');
mouseDown();assert.equal(g.state.lasers,1,'left click fires immediately');g.updateGameplay(.16);assert.equal(g.state.lasers,2,'holding left click repeats');mouseUp();g.updateGameplay(.16);assert.equal(g.state.lasers,2,'release stops repeating');
mouseDown(2);events.get('blur')();press('Enter');mouseUp(2);assert.equal(g.locks.size,0,'pause cancels right-click attack');
g.reset();g.camera.updateMatrixWorld();const enemy=g.createEnemy(0,12,-35);mouseDown(2);g.updateGameplay(.26);assert.ok(g.locks.has(enemy),'keyboard-only centered aim acquires lock');mouseUp(2);assert.equal(g.locks.size,0);assert.ok(g.state.lasers>0,'lock release creates curved beams');assert.equal(enemy.hp,3,'lock laser does not damage before arrival');assert.equal(g.state.bullets,0,'lock attack creates no player projectiles');
for(let i=0;i<90;i++)g.updateGameplay(1/60);assert.ok(enemy.dead,'homing laser destroys target');assert.ok(g.state.score>0);
g.reset();g.setInvulnerable(1000);for(let i=0;i<2040;i++)g.updateGameplay(1/60);
assert.ok(g.state.midBossSpawned,'midboss spawns at the middle of the course');assert.equal(currentTrack,'stage');
const mid=g.state.midBoss;assert.equal(mid.targets.length,16);assert.equal(mid.model.userData.segments.reduce((n,p)=>n+p.legs.length,0),32);
const heldStage=g.state.stageTime,oldHead=mid.targets[0].mesh.position.clone();for(let i=0;i<120;i++)g.updateGameplay(1/60);
assert.equal(g.state.stageTime,heldStage,'midboss battle holds stage progression');assert.ok(oldHead.distanceTo(mid.targets[0].mesh.position)>1,'segmented boss flies and undulates');assert.equal(g.state.bossSpawned,false);
mouseDown(2);g.updateGameplay(.26);
for(let i=0;i<6;i++){
 const p=g.screenPos(mid.targets[i+1].mesh.position);
 mouseMove(p.x,p.y);
 g.updateGameplay(.13);
}
assert.ok(g.locks.size>=2,'several body sections can be locked together');mouseUp(2);
for(let i=0;i<180;i++)g.updateGameplay(1/60);assert.ok(mid.hp<mid.maxHp,'homing lasers hit body segments');
const part=mid.targets.find(p=>!p.dead&&!p.head);g.damageEnemy(part,11);assert.ok(part.dead,'individual body shell is destroyed');g.updateGameplay(.02);assert.equal(part.mesh.parent,null,'destroyed segment is removed');
g.damageEnemy(mid.targets[0],300);assert.ok(mid.dead);assert.equal(currentTrack,'stage');assert.equal(g.state.mode,'playing','midboss victory does not finish the episode');assert.equal(elements.get('boss-bar').hidden,true);
g.updateGameplay(.02);assert.ok(g.state.stageTime>heldStage);assert.equal(g.enemies.filter(e=>e.midBoss).length,0);assert.equal(g.locks.size,0);
for(let i=0;i<2340;i++)g.updateGameplay(1/60);assert.ok(g.state.bossSpawned);assert.equal(currentTrack,'boss');assert.ok(g.state.boss.hp>0);assert.equal(elements.get('boss-health').style.width,'100%');assert.ok(parseFloat(elements.get('progress').style.width)<=80.01,'progress awaits final boss');
const fallingBoss=g.state.boss,crashHeight=fallingBoss.mesh.position.y,explosionsBefore=soundEvents.filter(x=>x==='largeExplosion').length;
g.damageEnemy(fallingBoss,300);assert.equal(g.state.mode,'boss-crash');
assert.ok(fallingBoss.mesh.parent,'dead boss remains visible until impact');
assert.equal(soundEvents.filter(x=>x==='largeExplosion').length,explosionsBefore,'explosion waits for water impact');
let endingNow=48;
g.frame(endingNow+=40);assert.ok(fallingBoss.mesh.position.y<crashHeight,'boss falls');
for(let i=0;i<300&&fallingBoss.mesh.parent;i++)g.frame(endingNow+=40);
assert.equal(fallingBoss.mesh.parent,null,'boss disappears at water impact');
assert.equal(g.state.mode,'boss-crash','splash plays before departure');
assert.equal(soundEvents.filter(x=>x==='largeExplosion').length,explosionsBefore+1);
assert.ok(Math.abs(fallingBoss.mesh.position.y-seaHeight(fallingBoss.mesh.position.x,fallingBoss.mesh.position.z,0,g.state.travel))<5,'impact is near the water surface');
for(let i=0;i<60&&g.state.mode==='boss-crash';i++)g.frame(endingNow+=40);
assert.equal(g.state.mode,'victory');assert.equal(elements.get('overlay').hidden,true);
const departure=g.dragon.position.clone(),finalScore=g.state.score,finalTime=g.state.elapsed,finalHealth=g.state.health;
mouseDown();press('Escape');g.hurt();assert.equal(g.state.mode,'victory');assert.equal(g.state.health,finalHealth);
for(let i=1;i<=95;i++)g.frame(endingNow+=40);
assert.equal(g.state.mode,'victory');assert.equal(elements.get('overlay').hidden,true,'score waits for departure');
assert.ok(g.dragon.position.y>departure.y+70,'dragon climbs away');
assert.ok(g.dragon.position.clone().project(g.camera).y>1,'dragon flies beyond the top of the screen');
assert.ok(g.dragon.userData.rig.wingMotion.effort>.6,'departure uses strong wing strokes');
for(let i=96;i<=102;i++)g.frame(endingNow+=40);
assert.equal(g.state.mode,'win');assert.equal(elements.get('overlay').hidden,false);assert.equal(g.dragon.visible,false);
assert.equal(g.state.score,finalScore);assert.equal(g.state.elapsed,finalTime);
assert.ok(elements.get('result-copy').textContent.includes(String(finalScore).padStart(6,'0')),'results show the final score');
press('Enter');assert.equal(g.state.mode,'playing');assert.equal(g.dragon.visible,true,'retry restores the dragon');
g.reset();for(let i=0;i<10;i++){g.setInvulnerable(0);g.hurt();}assert.equal(g.state.mode,'lose');assert.equal(g.state.health,0);
press('Enter');assert.equal(g.state.mode,'playing');assert.equal(g.state.score,0);assert.equal(g.enemies.length,0);assert.equal(g.state.bullets,0);assert.equal(g.state.lasers,0);assert.equal(g.control.steerX,0);assert.equal(g.control.steerY,0);assert.equal(g.state.midBoss,null);assert.equal(g.state.midBossSpawned,false);
press('KeyZ');mouseDown(2);g.updateGameplay(.02);events.get('blur')();assert.equal(g.state.mode,'paused');assert.equal(g.keys.size,0);assert.equal(g.control.shooting,false);const pausedLaserPosition=g.state.laserFlights[0]?.position.clone();g.frame(endingNow+40);if(pausedLaserPosition)assert.equal(g.state.laserFlights[0].position.distanceTo(pausedLaserPosition),0,'pause freezes flying lasers');assert.equal(g.locks.size,0);g.reset();assert.equal(g.state.mode,'playing');
assert.equal(events.has('pointermove'),true,'mouse aiming is registered');
// Steering reaches the same offset at different refresh rates and stays bounded.
for(const fps of [30,60,144]){const c={steerX:0,steerY:0};for(let i=0;i<fps*2;i++)stepSteering(c,new Set(['KeyA','KeyS']),1/fps);assert.equal(c.steerX,-1);assert.equal(c.steerY,-1);for(let i=0;i<fps*3;i++)stepSteering(c,new Set(),1/fps);assert.ok(Math.abs(c.steerX)<.0001);}
// Short presses use the original J laser, with damage only on impact.
g.reset();g.updateGameplay(.01);
const aimRay=new Three.Vector3(g.control.x/1440*2-1,1-g.control.y/900*2,.5).unproject(g.camera).sub(g.camera.position).normalize();
const aimedPosition=g.camera.position.clone().addScaledVector(aimRay,(-35-g.camera.position.z)/aimRay.z);
const laserEnemy=g.createEnemy(aimedPosition.x,aimedPosition.y,-35);laserEnemy.phase=0;mouseDown();mouseUp();assert.equal(laserEnemy.hp,3);assert.equal(g.state.lasers,1);assert.equal(g.state.bullets,0);
const shot=g.state.laserFlights[0],startPosition=shot.position.clone();assert.equal(shot.homing,false);assert.equal(shot.speed,70);assert.equal(shot.length,4.5);
for(let i=0;i<6;i++)g.updateGameplay(.01);assert.equal(laserEnemy.hp,3,'no damage before impact');assert.ok(shot.position.distanceTo(startPosition)>3);assert.ok(shot.position.distanceTo(startPosition)<5);
for(let i=0;i<90;i++)g.updateGameplay(1/60);assert.equal(laserEnemy.hp,2,'one tap inflicts one hit on arrival');assert.equal(g.state.lasers,0,'laser removed after impact');
// Body forward axis must converge on the sight in every quadrant/aspect ratio;
// rolling the wings must not skew the aiming direction.
for(const aspect of [4/3,16/9,21/9])for(const [sx,sy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[0,0]])for(const fps of [30,60,144]){
 const camera=new Three.PerspectiveCamera(56,aspect,.1,1500);camera.position.set(2,12,24);camera.lookAt(3,13,-100);camera.updateMatrixWorld();
 const body=new Three.Group();body.position.set(sx*8,7+sy*3,3);
 const point=reticleWorldPoint(camera,aimPixels({steerX:sx,steerY:sy},900*aspect,900),900*aspect,900);
 for(let i=0;i<fps;i++)turnTowardAim(body,camera,point,1/fps);
 const forward=new Three.Vector3(0,0,-1).applyQuaternion(body.quaternion),wanted=point.clone().sub(body.position).normalize();
 assert.ok(forward.dot(wanted)>.99999,'body points at reticle, independent of bank and aspect ratio');
}
// Each press turns another 90 degrees; repeat and vertical keys do nothing.
g.reset();press('ArrowUp');press('ArrowDown');assert.equal(g.state.view.targetYaw,0);
for(let i=1;i<=4;i++){press('KeyE');release('KeyE');assert.equal(g.state.view.targetYaw,-i*Math.PI/2);}
assert.equal(g.state.view.label,'前方');
events.get('keydown')({code:'KeyE',repeat:true,preventDefault(){}});assert.equal(g.state.view.targetYaw,-Math.PI*2);
press('KeyQ');assert.equal(g.state.view.targetYaw,-Math.PI*1.5);assert.equal(g.state.view.label,'左側');
press('ArrowUp');press('ArrowDown');assert.equal(g.state.view.targetYaw,-Math.PI*1.5);
for(let i=0;i<3;i++)press('KeyQ');assert.equal(g.state.view.targetYaw,0);
g.reset();press('KeyE');g.updateGameplay(.1);press('KeyR');assert.ok(Math.abs(Math.cos(g.state.view.targetYaw)-1)<1e-9,'R returns to front');
// Relative quarter turns expose and can attack enemies in every quadrant.
for(const side of [-1,1]){
 g.reset();g.setInvulnerable(1000);
 const flank=g.createEnemy(side*65,10,3,false,side<0?'left':'right');flank.fire=0;
 for(let frame=0;frame<600;frame++){
  g.updateGameplay(1/60);
  const separation=side*(flank.mesh.position.x-courseAt(g.state.elapsed).x);
  assert.ok(separation>60&&separation<70,'flank enemy stays in its parallel lane');
  assert.ok(Math.abs(flank.mesh.position.z-3)<=3.01,'flank enemy keeps pace along course');
 }
 assert.equal(flank.creature.rotation.y,0,'parallel enemy faces course-forward');
 assert.ok(flank.fire>0,'parallel enemy fires while alongside');
}
for(const [turns,approach] of [[0,'front'],[1,'right'],[2,'rear'],[3,'left']]){
 g.reset();for(let i=0;i<turns;i++)press('KeyE');for(let i=0;i<60;i++)g.updateGameplay(1/60);
 assert.equal(g.control.steerX,0,'direction keys switch view instead of strafing');assert.equal(g.control.steerY,0);
 const expected=new Three.Vector3(-Math.sin((-turns*Math.PI/2)),0,-Math.cos((-turns*Math.PI/2)));
 assert.ok(g.camera.getWorldDirection(new Three.Vector3()).dot(expected)>.999,'camera faces selected cardinal direction');
 const ray=reticleWorldPoint(g.camera,g.control,1440,900).sub(g.camera.position).normalize();
 const position=g.camera.position.clone().addScaledVector(ray,80);
 const target=g.createEnemy(position.x,position.y,position.z,false,approach);
 mouseDown(2);g.updateGameplay(.26);assert.ok(g.locks.has(target),'target can be locked in '+approach+' view');
 assert.ok(g.state.radarDots.has(target),'target appears on radar');mouseUp(2);
 for(let i=0;i<150;i++)g.updateGameplay(1/60);
 assert.ok(target.dead,'homing laser hits in '+approach+' view');assert.equal(g.state.radarDots.has(target),false,'destroyed target leaves radar');
}
const origin=new Three.Vector3();
assert.ok(radarContact(new Three.Vector3(0,0,-50),origin).y<.5);assert.ok(radarContact(new Three.Vector3(50,0,0),origin).x>.5);
assert.ok(radarContact(new Three.Vector3(-50,0,0),origin).x<.5);assert.ok(radarContact(new Three.Vector3(0,0,50),origin).behind);
assert.equal(radarContact(new Three.Vector3(0,0,190),origin).visible,false);
g.reset();g.setInvulnerable(1000);for(let i=0;i<780;i++)g.updateGameplay(1/60);
assert.ok(g.enemies.some(e=>e.approach==='rear'),'rear ambush arrives during normal play');assert.ok(elements.get('rear-warning').textContent.includes('迎撃'),'rear approach warning is visible');
press('KeyE');press('KeyE');for(let i=0;i<60;i++)g.updateGameplay(1/60);press('Escape');const savedYaw=g.state.view.yaw;g.frame(96);assert.equal(g.state.view.yaw,savedYaw,'pause freezes view');g.reset();assert.equal(g.state.view.targetYaw,0);assert.equal(g.state.radarDots.size,0,'retry clears radar');
g.reset();g.setInvulnerable(1000);for(let i=0;i<540;i++)g.updateGameplay(1/60);
assert.equal(g.enemies.filter(e=>e.warship).length,2,'ancient patrol ships appear on the sea');
g.reset();g.setInvulnerable(1000);const ship=g.spawnWarship(0,-65);ship.fire=0;g.updateGameplay(.02);
assert.ok(g.state.bullets>0,'ship turret fires at the dragon');assert.ok(g.state.radarDots.get(ship).className.includes('surface'));
assert.ok(Math.abs(ship.mesh.position.y-(seaHeight(ship.mesh.position.x,ship.mesh.position.z,0,0)+.95))<1e-8,'ship floats at animated sea height');
mouseDown(2);g.updateGameplay(.26);const shipPoint=g.screenPos(ship.mesh.position);mouseMove(shipPoint.x,shipPoint.y);g.updateGameplay(.01);
assert.ok(g.locks.has(ship),'surface ship can be locked');mouseUp(2);assert.equal(ship.hp,1,'ship is not damaged until laser arrives');
press('Escape');const shipPosition=ship.mesh.position.clone();g.frame(128);assert.equal(ship.mesh.position.distanceTo(shipPosition),0,'pause freezes ship');press('Enter');
for(let i=0;i<100;i++)g.updateGameplay(1/60);assert.ok(ship.dead,'one homing laser destroys warship');
assert.equal(ship.mesh.parent,null);assert.equal(g.state.radarDots.has(ship),false);assert.ok(g.state.score>=600,'ship destruction awards score');
g.reset();assert.equal(g.enemies.filter(e=>e.warship).length,0);
const easyBoat=g.spawnWarship(0,-40);g.updateGameplay(.01);
const boatSight=g.screenPos(easyBoat.mesh.position);mouseMove(boatSight.x,boatSight.y);mouseDown();mouseUp();
assert.equal(easyBoat.hp,1,'boat waits for laser impact');
for(let i=0;i<90;i++)g.updateGameplay(1/60);assert.ok(easyBoat.dead,'one normal laser destroys the boat');
// Side/rear views turn the rider and gun while the dragon keeps flying forward.
for(const turns of [1,2,3]){
 g.reset();for(let i=0;i<turns;i++)press('KeyE');for(let i=0;i<90;i++)g.updateGameplay(1/60);
 const bodyForward=new Three.Vector3(0,0,-1).applyQuaternion(g.dragon.quaternion);
 assert.ok(bodyForward.z<-.99,'dragon stays course-forward when rider looks away');
 const rig=g.rider.userData.rig;g.rider.updateWorldMatrix(true,true);
 const gunForward=new Three.Vector3(0,0,-1).applyQuaternion(rig.weapon.getWorldQuaternion(new Three.Quaternion()));
 const sight=reticleWorldPoint(g.camera,g.control,1440,900),gunPosition=riderMuzzle(g.rider);
 assert.ok(gunForward.dot(sight.sub(gunPosition).normalize())>.995,'rider weapon follows side/rear reticle');
 assert.ok(Math.abs(rig.hips.rotation.y)>.5,'rider visibly swivels in saddle');
 mouseDown();mouseUp();
 const pulse=g.state.laserFlights[0];assert.ok(pulse.position.distanceTo(riderMuzzle(g.rider))<.05,'side/rear laser originates at rider weapon');
 press('Escape');const yaw=rig.yaw;g.frame(160);assert.equal(rig.yaw,yaw);g.reset();assert.equal(rig.yaw,0,'retry restores forward rider pose');
}
for(const name of ['laser','homing','damage','smallExplosion','mediumExplosion','largeExplosion','shipShot','bossVolley','summon','bossWarning'])assert.ok(soundEvents.includes(name),'game triggers SE '+name);

// Actual wings and body detach without changing their world position.
g.reset();
const shattered=g.createEnemy(8,15,-40),wing=shattered.creature.userData.rig.wings[0].shoulder;
assert.equal(shattered.creature.name,'eagle-sky-beast','regular enemies use the eagle beast');
assert.equal(shattered.creature.userData.rig.tail.length,1,'a short feather fan replaces the segmented dragon tail');
wing.updateWorldMatrix(true,true);const wingPosition=wing.getWorldPosition(new Three.Vector3());
g.damageEnemy(shattered,3);
let debris=g.state.effects.filter(e=>e.debris);
assert.equal(debris.filter(e=>e.mesh.name==='wing-debris').length,2);
assert.equal(debris.filter(e=>e.mesh.name==='body-debris').length,1);
assert.ok(wing.getWorldPosition(new Three.Vector3()).distanceTo(wingPosition)<1e-6,'detachment preserves world transform');
const count=debris.length;g.damageEnemy(shattered,3);assert.equal(g.state.effects.filter(e=>e.debris).length,count,'no duplicate breakup');
g.updateGameplay(.01);assert.equal(shattered.mesh.parent,null);assert.ok(wing.parent.parent,'fragments survive enemy cleanup');
const chunk=debris[0],position=chunk.mesh.position.clone();
g.frame(100000);assert.ok(chunk.mesh.position.distanceTo(position)>0);assert.ok(chunk.mesh.rotation.toArray().slice(0,3).some(n=>Math.abs(n)>0));
for(let i=1;i<65;i++)g.frame(100000+i*40);
assert.equal(g.state.effects.filter(e=>e.debris).length,0,'debris expires');assert.equal(chunk.mesh.parent,null);
g.reset();const wreck=g.spawnWarship(8,-40);g.damageEnemy(wreck,1);
debris=g.state.effects.filter(e=>e.debris);
assert.equal(debris.filter(e=>e.mesh.name==='wood-debris').length,18);
assert.equal(debris.filter(e=>e.mesh.name==='iron-debris').length,6);
assert.equal(debris.filter(e=>e.mesh.name==='turret-debris').length,1);
assert.ok(debris.find(e=>e.mesh.name==='wood-debris').mesh.children[0].material.map,'wood retains grain');
g.reset();assert.equal(g.state.effects.length,0);assert.ok(debris.every(e=>!e.mesh.parent),'retry clears wreckage');

g.reset();for(let i=0;i<150;i++)g.updateGameplay(1/60);
assert.ok(g.enemies.some(e=>e.insect),'regular waves include insects');
assert.ok(g.enemies.some(e=>!e.insect&&!e.warship),'eagle enemies remain in mixed waves');
g.reset();const insect=g.createEnemy(5,12,-40,false,'front',true);
assert.equal(insect.creature.name,'four-wing-sky-insect');assert.equal(insect.creature.userData.rig.wings.length,4);
const frontWing=insect.creature.userData.rig.wings[0].shoulder;
animateSkyInsect(insect.creature,.1);const flapAngle=frontWing.rotation.z;
animateSkyInsect(insect.creature,.15);assert.notEqual(frontWing.rotation.z,flapAngle,'insect wings flutter');
assert.ok(dragonMouth(insect.creature).z>insect.mesh.position.z,'attack originates at the head');
g.damageEnemy(insect,3);assert.equal(g.state.effects.filter(e=>e.mesh.name==='wing-debris').length,4,'all four wings break away');
g.reset();
g.reset();const unchangedAim={x:g.control.x,y:g.control.y};
elements.get('invert-y').onclick();assert.equal(g.control.invertY,true);assert.equal(elements.get('invert-y').ariaPressed,'true');
for(const touch of [false,true]){
 for(const up of [false,true]){
  const c={steerX:0,steerY:0,invertY:true};if(touch){c.touchY=up?1:-1;c.touchX=.5;}
  stepSteering(c,new Set([up?'KeyW':'KeyS']),.1);assert.ok(up?c.steerY<0:c.steerY>0,'keyboard and touch reverse vertical movement');
  if(touch)assert.ok(c.steerX>0,'horizontal movement stays normal');
 }
}
assert.equal(g.control.x,unchangedAim.x);assert.equal(g.control.y,unchangedAim.y,'toggle preserves aim');
g.reset();assert.equal(g.control.invertY,true,'retry retains inversion');
localStorage.setItem=()=>{throw new Error('storage unavailable');};elements.get('invert-y').onclick();assert.equal(g.control.invertY,false,'toggle works without storage');
let keyTime=1000;context.Date={now:()=>keyTime};
for(const [code,yaw] of [['KeyA',Math.PI/2],['KeyD',-Math.PI/2]]){
 g.reset();press(code);keyTime+=70;release(code);keyTime+=100;press(code);
 assert.equal(g.state.view.targetYaw,yaw,'double movement key turns 90 degrees');
 events.get('keydown')({code,repeat:true,preventDefault(){}});assert.equal(g.state.view.targetYaw,yaw,'auto-repeat does not turn again');
 release(code);g.reset();press(code);keyTime+=500;release(code);keyTime+=60;press(code);assert.equal(g.state.view.targetYaw,0,'long press remains movement');release(code);
}
g.reset();press('KeyA');keyTime+=60;release('KeyA');keyTime+=60;press('KeyD');assert.equal(g.state.view.targetYaw,0,'mixed directions do not count');release('KeyD');
g.reset();press('KeyD');keyTime+=60;release('KeyD');press('Escape');press('Enter');keyTime+=60;press('KeyD');assert.equal(g.state.view.targetYaw,0,'pause clears pending tap');release('KeyD');
console.log('PASS: rider swivelling and weapon emission, keyboard start/retry, four-direction attacks, radar, floating warships, turret fire, surface lock/hit/destruction, automatic rail, reticle-facing rotation, flying lasers, pause, segmented midboss, final boss, victory and defeat.');
