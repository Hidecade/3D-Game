import { readdirSync, readFileSync } from 'node:fs';

// Use the same real /audio/SE paths in development and in the built game.
export default {
 publicDir:false,
 plugins:[{
  name:'copy-sound-effects',
  generateBundle(){
   for(const name of ['潮の誓い.mp3','tide-oath.ogg','星を撃て.mp3','shoot-the-stars.ogg']){
    this.emitFile({type:'asset',fileName:'audio/'+name,source:readFileSync(new URL('./audio/'+name,import.meta.url))});
   }
   const directory=new URL('./audio/SE/',import.meta.url);
   for(const name of readdirSync(directory))if(name.endsWith('.wav')){
    this.emitFile({type:'asset',fileName:'audio/SE/'+name,source:readFileSync(new URL(name,directory))});
   }
  },
 }],
};
