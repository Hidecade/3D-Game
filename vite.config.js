import { readdirSync, readFileSync } from 'node:fs';
const buildId=process.env.GITHUB_SHA||`local-${Date.now()}`;

// Use the same real /audio/SE paths in development and in the built game.
export default {
 base:'./',
 publicDir:false,
 build:{rollupOptions:{input:{game:'index.html',gallery:'gallery.html'}}},
 define:{__BUILD_ID__:JSON.stringify(buildId)},
 // The running bundle and version endpoint always describe the same build.
 plugins:[{
  name:'copy-sound-effects',
  generateBundle(){
   this.emitFile({type:'asset',fileName:'version.json',source:JSON.stringify({version:buildId})});
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
