export function installTouchControls({control,playing,turn,fire,lock,release,cancel,unlock}){
 const ui=document.getElementById('touch-controls'),stick=document.getElementById('touch-stick'),knob=document.getElementById('touch-knob');
 const pointers=new Map();
 function reset(){pointers.clear();control.touchX=control.touchY=undefined;knob.style.transform='translate(-50%,-50%)';cancel();}
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
  }else aim(e.clientX-state.x,e.clientY-state.y);
  state.x=e.clientX;state.y=e.clientY;
 }
 for(const [id,kind] of [['touch-stick','stick'],['touch-aim','aim'],['touch-lock','lock']]){
  const element=document.getElementById(id);
  element.addEventListener('pointerdown',e=>{
   if(e.pointerType!=='touch'||!playing()||[...pointers.values()].some(p=>p.kind===kind))return;
   e.preventDefault();e.stopPropagation();show();unlock();element.setPointerCapture(e.pointerId);
   const state={kind,x:e.clientX,y:e.clientY};pointers.set(e.pointerId,state);
   if(kind==='stick')move(e,state);
   else if(kind==='lock'){control.shooting=false;lock();}
   else if(!control.locking){control.shooting=true;fire();}
  });
  element.addEventListener('pointermove',e=>{const state=pointers.get(e.pointerId);if(state&&playing()){e.preventDefault();move(e,state);}});
  element.addEventListener('pointerup',e=>{
   const state=pointers.get(e.pointerId);if(!state)return;e.preventDefault();pointers.delete(e.pointerId);
   if(state.kind==='stick'){control.touchX=control.touchY=undefined;knob.style.transform='translate(-50%,-50%)';}
   else if(state.kind==='lock'){if(playing())release();control.shooting=playing()&&[...pointers.values()].some(p=>p.kind==='aim');}
   else control.shooting=false;
  });
  for(const event of ['pointercancel','lostpointercapture'])element.addEventListener(event,e=>{if(pointers.has(e.pointerId))reset();});
 }
 for(const [id,code] of [['touch-left','KeyQ'],['touch-right','KeyE'],['touch-front','KeyR']])document.getElementById(id).addEventListener('click',()=>{if(playing())turn(code);});
 window.addEventListener('resize',reset);
 return {reset};
}
