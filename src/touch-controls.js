export function installTouchControls({control,playing,turn,fire,lock,release,cancel,unlock}){
 const ui=document.getElementById('touch-controls'),stick=document.getElementById('touch-stick'),knob=document.getElementById('touch-knob');
 const pointers=new Map();
 // Safari can still interpret repeated/multiple touches as browser zoom.
 // Gameplay uses Pointer Events, so suppress only the browser's touch defaults.
 const blockZoom=e=>{if(e.cancelable!==false)e.preventDefault();};
 for(const name of ['gesturestart','gesturechange','gestureend'])window.addEventListener(name,blockZoom,{passive:false});
 for(const name of ['touchstart','touchmove','touchend'])window.addEventListener(name,e=>{
  if(playing()&&e.target?.closest?.('#touch-controls, #world'))blockZoom(e);
 },{passive:false});
 let lastTap=-Infinity,lastDirection=0,downAt=null,activeDirection=0;
 function clearTurnGesture(){lastTap=-Infinity;lastDirection=0;downAt=null;activeDirection=0;}
 function turnGesture(x,y){
  const now=Date.now();
  if(activeDirection&&x*activeDirection<.3){
   lastTap=downAt!==null&&now-downAt<=220&&Math.abs(y)<.45&&Math.abs(x)<.3?now:-Infinity;
   lastDirection=activeDirection;activeDirection=0;downAt=null;
  }
  if(!activeDirection&&Math.abs(x)>.65&&Math.abs(y)<.45){
   activeDirection=Math.sign(x);
   if(activeDirection===lastDirection&&now-lastTap<=320){lastTap=-Infinity;downAt=null;turn(activeDirection>0?'KeyE':'KeyQ');}
   else{lastTap=-Infinity;downAt=now;}
  }
 }
 function reset(){clearTurnGesture();pointers.clear();control.touchX=control.touchY=undefined;knob.style.transform='translate(-50%,-50%)';cancel();}
 function endPointer(pointerId,aborted=false){
  const state=pointers.get(pointerId);if(!state)return;pointers.delete(pointerId);
  if(state.kind==='stick'){if(aborted||!playing())clearTurnGesture();else turnGesture(0,0);control.touchX=control.touchY=undefined;knob.style.transform='translate(-50%,-50%)';}
  else if(state.kind==='lock'){
   if(aborted||!playing())cancel();else{
    release();
    control.x=innerWidth*.5;control.y=innerHeight*.48;
   }
   control.shooting=playing()&&[...pointers.values()].some(p=>p.kind==='aim');
  }else control.shooting=false;
 }
 function show(){document.body.classList.add('touch-mode');}
 if(window.matchMedia?.('(pointer: coarse)').matches)show();
 window.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')show();});
 function aim(dx,dy){control.x=Math.max(12,Math.min(innerWidth-12,control.x+dx*1.5));control.y=Math.max(12,Math.min(innerHeight-12,control.y+dy*1.5));}
 function move(e,state){
  if(state.kind==='stick'){
   const r=stick.getBoundingClientRect(),radius=r.width*.36;
   let x=(e.clientX-r.left-r.width/2)/radius,y=(r.top+r.height/2-e.clientY)/radius;
   const length=Math.max(1,Math.hypot(x,y));x/=length;y/=length;
   control.touchX=x;control.touchY=y;knob.style.transform=`translate(calc(-50% + ${x*radius}px),calc(-50% + ${-y*radius}px))`;
   turnGesture(x,y);
  }else aim(e.clientX-state.x,e.clientY-state.y);
  state.x=e.clientX;state.y=e.clientY;
 }
 for(const [id,kind] of [['touch-stick','stick'],['touch-aim','aim'],['touch-lock','lock']]){
  const element=document.getElementById(id);
  element.addEventListener('pointerdown',e=>{
   if(e.pointerType!=='touch'||!playing())return;
   // A fresh touch can reclaim a control after a browser lost an end event.
   for(const [id,state] of pointers)if(state.kind===kind)endPointer(id,true);
   e.preventDefault();e.stopPropagation();show();unlock();
   const state={kind,x:e.clientX,y:e.clientY};pointers.set(e.pointerId,state);
   try{element.setPointerCapture(e.pointerId);}catch{/* Window end handlers still release this touch. */}
   if(kind==='stick')move(e,state);
   else if(kind==='lock'){control.shooting=false;lock();}
   else if(!control.locking){control.shooting=true;fire();}
  });
  element.addEventListener('pointermove',e=>{const state=pointers.get(e.pointerId);if(state&&playing()){e.preventDefault();move(e,state);}});
  element.addEventListener('pointerup',e=>{
   if(!pointers.has(e.pointerId))return;e.preventDefault();endPointer(e.pointerId);
  });
  for(const event of ['pointercancel','lostpointercapture'])element.addEventListener(event,e=>endPointer(e.pointerId,true));
 }
 for(const [id,code] of [['touch-front','KeyR']]){
  const button=document.getElementById(id);let lastTouch=-Infinity;
  // Secondary fingers do not reliably generate click on iOS. Act on touch down.
  button.addEventListener('pointerdown',e=>{
   if(e.pointerType!=='touch'||!playing())return;
   e.preventDefault();e.stopPropagation();lastTouch=Date.now();turn(code);
  });
  button.addEventListener('click',e=>{if(e.pointerType!=='touch'&&Date.now()-lastTouch>700&&playing())turn(code);});
 }
 window.addEventListener('pointerup',e=>endPointer(e.pointerId));
 window.addEventListener('pointercancel',e=>endPointer(e.pointerId,true));
 // Safari's address bar changes viewport height without ending the gesture.
 let width=innerWidth;
 window.addEventListener('resize',()=>{if(innerWidth!==width){width=innerWidth;reset();}});
 return {reset};
}
