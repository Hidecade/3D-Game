// Real paths are shared by the development server and production build.
export const SOUND_ASSETS={
 laser:{url:'./audio/SE/ark_laser.wav',volume:.16,cooldown:.12,voices:3},
 homing:{url:'./audio/SE/player_homing.wav',volume:.36,cooldown:.12,voices:2},
 damage:{url:'./audio/SE/player_damage.wav',volume:.42,cooldown:.25,voices:1},
 smallExplosion:{url:'./audio/SE/enemy_explode_small.wav',volume:.29,cooldown:.06,voices:3},
 mediumExplosion:{url:'./audio/SE/enemy_explode_medium.wav',volume:.36,cooldown:.1,voices:2},
 largeExplosion:{url:'./audio/SE/enemy_explode_large.wav',volume:.45,cooldown:.3,voices:1},
 enemyShot:{url:'./audio/SE/ark_fighter.wav',volume:.12,cooldown:.2,voices:2},
 shipShot:{url:'./audio/SE/ark_rotary.wav',volume:.23,cooldown:.2,voices:2},
 bossVolley:{url:'./audio/SE/boss_3way.wav',volume:.32,cooldown:.2,voices:2},
 summon:{url:'./audio/SE/ark_summon.wav',volume:.35,cooldown:.4,voices:1},
 bossWarning:{url:'./audio/SE/boss_shockwave.wav',volume:.4,cooldown:.5,voices:1},
};

export function createSoundEffects(getContext,{fetchAudio=(...args)=>fetch(...args),now=()=>performance.now()/1000}={}){
 let enabled=false,suspended=false,generation=0;
 const buffers=new Map(),loading=new Map(),lastPlayed=new Map(),active=[];
 function remove(voice,stop=false){const index=active.indexOf(voice);if(index>=0)active.splice(index,1);voice.source.onended=null;if(stop){try{voice.source.stop();}catch{}}voice.source.disconnect();voice.gain.disconnect();}
 function stopAll(){generation++;for(const voice of [...active])remove(voice,true);lastPlayed.clear();}
 async function load(name){
  if(buffers.has(name))return buffers.get(name);
  if(loading.has(name))return loading.get(name);
  const pending=(async()=>{try{
   const response=await fetchAudio(SOUND_ASSETS[name].url);if(!response.ok)throw new Error(`HTTP ${response.status}`);
   const buffer=await getContext().decodeAudioData(await response.arrayBuffer());buffers.set(name,buffer);return buffer;
  }catch(error){console.warn(`SE could not be loaded: ${name}`,error.message);return null;}})();
  loading.set(name,pending);
  try{return await pending;}finally{loading.delete(name);}
 }
 function start(name,buffer){
  if(!enabled||suspended||!buffer)return;
  const asset=SOUND_ASSETS[name],stamp=now();if(stamp-(lastPlayed.get(name)??-Infinity)<asset.cooldown)return;
  const same=active.filter(v=>v.name===name);
  if(same.length>=asset.voices)remove(same[0],true);
  if(active.length>=16)remove(active[0],true);
  const context=getContext(),source=context.createBufferSource(),gain=context.createGain();
  source.buffer=buffer;gain.gain.value=asset.volume;source.connect(gain).connect(context.destination);
  const voice={name,source,gain};active.push(voice);lastPlayed.set(name,stamp);
  source.onended=()=>remove(voice);source.start();
 }
 return {
  setEnabled(value){enabled=value;if(!value)stopAll();},
  setSuspended(value){suspended=value;if(value)stopAll();},
  stopAll,
  async unlock(){
   if(!enabled)return;
   try{await Promise.all([getContext().resume(),...Object.keys(SOUND_ASSETS).map(load)]);}catch(error){console.warn('SE initialization failed',error.message);}
  },
  play(name){
   if(!enabled||suspended||!SOUND_ASSETS[name])return;
   if(buffers.has(name)){start(name,buffers.get(name));return;}
   const requestGeneration=generation,requested=now();
   void load(name).then(buffer=>{if(generation===requestGeneration&&now()-requested<.4)start(name,buffer);});
  },
 };
}
