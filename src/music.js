export const MUSIC_URL='./audio/潮の誓い.mp3';
export const MUSIC_FALLBACK_URL='./audio/tide-oath.ogg';
export const MUSIC_TRACKS={
 stage:{url:MUSIC_URL,fallback:MUSIC_FALLBACK_URL},
 boss:{url:'./audio/星を撃て.mp3',fallback:'./audio/shoot-the-stars.ogg'},
};

export function createMusic(audio=new Audio()){
 let enabled=true,playing=false,fallback=false,track='stage',generation=0;
 audio.src=MUSIC_URL;audio.preload='auto';audio.loop=true;audio.volume=.32;
 function sync(){
  if(!enabled||!playing){audio.pause();return;}
  const request=generation;
  void audio.play().catch(error=>{
   if(request!==generation)return;
   if(error.name==='NotSupportedError')useFallback();
   else if(error.name!=='AbortError')console.warn('BGM playback:',error.message);
  });
 }
 function useFallback(){
  if(fallback){console.warn('BGM could not be loaded');return;}
  fallback=true;generation++;audio.src=MUSIC_TRACKS[track].fallback;sync();
 }
 audio.addEventListener('error',useFallback);
 return {
  start(restart=false,nextTrack=track){
   if(!MUSIC_TRACKS[nextTrack])return;
   if(nextTrack!==track){audio.pause();generation++;track=nextTrack;fallback=false;audio.src=MUSIC_TRACKS[track].url;}
   if(restart)audio.currentTime=0;playing=true;sync();
  },
  pause(){playing=false;sync();},
  setEnabled(value){enabled=value;sync();},
 };
}
