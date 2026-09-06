export function installUpdatePrompt({
 currentVersion=typeof __BUILD_ID__==='undefined'?'dev':__BUILD_ID__,
 page=window,doc=document,fetchVersion=(...args)=>fetch(...args),now=()=>Date.now(),
}={}){
 if(currentVersion==='dev')return;
 const banner=doc.getElementById('update-notice'),button=doc.getElementById('update-game');
 let inFlight=false,lastCheck=-Infinity,available=null;
 async function check(){
  if(doc.hidden||inFlight||now()-lastCheck<10000)return;
  inFlight=true;lastCheck=now();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{
   const url=new URL('./version.json',page.location.href);url.searchParams.set('check',String(now()));
   const response=await fetchVersion(url,{cache:'no-store',signal:controller.signal});
   if(!response.ok)return;
   const data=await response.json();
   if(typeof data.version!=='string'||!data.version||data.version.length>128)return;
   available=data.version===currentVersion?null:data.version;
   banner.hidden=!available;
  }catch{/* Offline or temporary errors leave the game and any update notice alone. */}
  finally{clearTimeout(timeout);inFlight=false;}
 }
 button.addEventListener('click',()=>{
  if(!available)return;
  // A distinct navigation URL avoids restoring cached HTML from the old build.
  const url=new URL(page.location.href);url.searchParams.set('_v',available);
  page.location.replace(url.href);
 });
 doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)void check();});
 for(const event of ['pageshow','focus','online'])page.addEventListener(event,()=>void check());
 void check();
 return {check};
}
