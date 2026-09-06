import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSoundEffects, SOUND_ASSETS } from '../src/sound-effects.js';
import { createMusic, MUSIC_URL, MUSIC_FALLBACK_URL, MUSIC_TRACKS } from '../src/music.js';

let clock=0,starts=0,resumes=0;
const voices=[];
const context={destination:{},async resume(){resumes++;},async decodeAudioData(bytes){assert.ok(bytes.byteLength>0);return {decoded:true};},
 createGain(){return {gain:{value:0},connect(){return this;},disconnect(){}};},
 createBufferSource(){const s={onended:null,stopped:false,connect(gain){return gain;},disconnect(){},start(){starts++;},stop(){this.stopped=true;this.onended?.();}};voices.push(s);return s;},
};
const bank=createSoundEffects(()=>context,{now:()=>clock,fetchAudio:async url=>{
 const data=fs.readFileSync(new URL('../'+url.replace('./',''),import.meta.url));
 return {ok:true,arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};
}});
bank.play('laser');assert.equal(starts,0,'muted by default');bank.setEnabled(true);await bank.unlock();assert.equal(resumes,1);
bank.play('laser');bank.play('laser');assert.equal(starts,1,'rapid duplicates are throttled');
for(let i=0;i<8;i++){clock+=.15;bank.play('laser');}
assert.equal(voices.filter(v=>!v.stopped).length,3,'laser polyphony is bounded');
bank.play('largeExplosion');assert.equal(voices.filter(v=>!v.stopped).length,4);
bank.setSuspended(true);assert.ok(voices.every(v=>v.stopped));const pausedStarts=starts;bank.play('damage');assert.equal(starts,pausedStarts);
bank.setSuspended(false);bank.play('damage');assert.equal(starts,pausedStarts+1);bank.setEnabled(false);assert.ok(voices.every(v=>v.stopped));
bank.setEnabled(true);bank.play('homing');bank.stopAll();assert.ok(voices.every(v=>v.stopped),'retry stops previous sounds');

// An asynchronously decoded effect must not leak through after mute/restart.
let finishFetch;const delayed=createSoundEffects(()=>context,{now:()=>clock,fetchAudio:()=>new Promise(resolve=>{finishFetch=resolve;})});
delayed.setEnabled(true);delayed.play('homing');delayed.setEnabled(false);const before=starts;
finishFetch({ok:true,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer});
await new Promise(resolve=>setTimeout(resolve,0));assert.equal(starts,before);
for(const asset of Object.values(SOUND_ASSETS))assert.ok(fs.existsSync(new URL('../'+asset.url.replace('./',''),import.meta.url)));
// PCM WAV avoids relying on the embedded browser's MP3 codec.
for(const asset of Object.values(SOUND_ASSETS)){
 const bytes=fs.readFileSync(new URL('../'+asset.url.replace('./',''),import.meta.url));
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');
 let pcm=false,audible=false;
 for(let offset=12;offset+8<=bytes.length;){
  const tag=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4),start=offset+8;
  assert.ok(start+size<=bytes.length);
  if(tag==='fmt '){assert.equal(bytes.readUInt16LE(start),1);assert.equal(bytes.readUInt16LE(start+14),16);pcm=true;}
  if(tag==='data')for(let i=start;i+1<start+size;i+=2)if(Math.abs(bytes.readInt16LE(i))>100){audible=true;break;}
  offset=start+size+(size%2);
 }
 assert.ok(pcm&&audible,'sound asset contains non-silent 16-bit PCM');
}
// A failed download must not poison the cache for the rest of the session.
let attempts=0;
const retry=createSoundEffects(()=>context,{now:()=>clock,fetchAudio:async()=>{
 attempts++;return attempts===1?{ok:false,status:503}:{ok:true,arrayBuffer:async()=>new Uint8Array([1]).buffer};
}});
retry.setEnabled(true);retry.play('laser');await new Promise(resolve=>setTimeout(resolve,0));
const retryStarts=starts;retry.play('laser');await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(attempts,2);assert.equal(starts,retryStarts+1,'failed SE can load and play on retry');
console.log('PASS: SE asset paths, preload, mute, pause, cooldown, polyphony, retry cleanup, cancellation of pending audio.');
const musicEvents=new Map();
const media={currentTime:0,paused:true,addEventListener(name,fn){musicEvents.set(name,fn);},async play(){this.paused=false;},pause(){this.paused=true;}};
const music=createMusic(media);
assert.equal(media.src,MUSIC_URL);assert.equal(media.loop,true);assert.equal(media.paused,true,'no autoplay before start');
music.start(true);assert.equal(media.paused,false);media.currentTime=42;
music.pause();assert.equal(media.paused,true);music.start();assert.equal(media.currentTime,42,'resume preserves track position');
music.setEnabled(false);assert.equal(media.paused,true);music.setEnabled(true);assert.equal(media.paused,false);
music.start(true);assert.equal(media.currentTime,0,'retry starts music from beginning');
musicEvents.get('error')();assert.equal(media.src,MUSIC_FALLBACK_URL);assert.equal(media.paused,false,'unsupported MP3 uses Ogg');
music.pause();music.setEnabled(false);music.setEnabled(true);assert.equal(media.paused,true,'unmute does not start paused game music');
for(const url of [MUSIC_URL,MUSIC_FALLBACK_URL])assert.ok(fs.existsSync(new URL('../'+url,import.meta.url)));
console.log('PASS: BGM start, loop, pause/resume, mute, retry, and codec fallback.');
music.start(true,'boss');assert.equal(media.src,MUSIC_TRACKS.boss.url);assert.equal(media.currentTime,0);
media.currentTime=25;music.pause();music.start();assert.equal(media.src,MUSIC_TRACKS.boss.url);assert.equal(media.currentTime,25);
musicEvents.get('error')();assert.equal(media.src,MUSIC_TRACKS.boss.fallback,'boss uses its own fallback');
music.setEnabled(false);music.start(true,'stage');assert.equal(media.src,MUSIC_URL);assert.equal(media.paused,true,'track changes respect mute');
music.setEnabled(true);assert.equal(media.paused,false);
