export function installTouchControls({control,playing,turn,fire,lock,release,cancel,unlock}){
 const ui=document.getElementById('touch-controls'),stick=document.getElementById('touch-stick'),knob=document.getElementById('touch-knob');
 const pointers=new Map();
 let lastRightTap=-Infinity,rightDownAt=null,rightActive=false;
 function clearRightGesture(){lastRightTap=-Infinity;rightDownAt=null;rightActive=false;}
 function rightGesture(x,y){
  const now=Date.now();
  if(!rightActive&&x>.65&&Math.abs(y)<.45){
   rightActive=true;
   if(now-lastRightTap<=320){lastRightTap=-Infinity;rightDownAt=null;turn('KeyE');}
   else rightDownAt=now;
  }else if(rightActive&&x<.3){
   lastRightTap=rightDownAt!==null&&now-rightDownAt<=220&&Math.abs(y)<.45&&x>-.3?now:-Infinity;
   rightActive=false;rightDownAt=null;
  }
 }
 function reset(){clearRightGesture();pointers.clear();control.touchX=control.touchY=undefined;knob.style.transform='translate(-50%,-50%)';cancel();}
 function endPointer(pointerId,aborted=false){
  const state=pointers.get(pointerId);if(!state)return;pointers.delete(pointerId);
  if(state.kind==='stick'){if(aborted||!playing())clearRightGesture();else rightGesture(0,0);control.touchX=control.touchY=undefined;knob.style.transform='translate(-50%,-50%)';}
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
   rightGesture(x,y);
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
 for(const [id,code] of [['touch-left','KeyQ'],['touch-right','KeyE'],['touch-front','KeyR']]){
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
