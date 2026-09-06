import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';

// Concentric rings keep nearby waves detailed in all four viewing directions.
function oceanGrid(){
 const nx=256,nz=176,positions=[],uv=[],indices=[];
 for(let z=0;z<=nz;z++){
  const radius=.01+1900*Math.pow(z/nz,2.6);
  for(let x=0;x<=nx;x++){
   const angle=x/nx*Math.PI*2;
   positions.push(Math.cos(angle)*radius,Math.sin(angle)*radius,0);uv.push(x/nx,z/nz);
   if(x<nx&&z<nz){const a=z*(nx+1)+x;indices.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2);}
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function createOcean(){
 // Three's Water supplies the reflected camera and clips geometry below sea level.
 const water=new Water(oceanGrid(),{textureWidth:768,textureHeight:512,waterColor:0x124f59,sunColor:0xffedcc,sunDirection:new THREE.Vector3(-.3,.46,-.84).normalize(),fog:true});
 water.name='gerstner-ocean';water.rotation.x=-Math.PI/2;water.position.y=-2;water.frustumCulled=false;
 const material=water.material;material.uniforms.travel={value:0};
 material.vertexShader=`
 uniform mat4 textureMatrix;
 uniform float time;
 uniform float travel;
 varying vec4 mirrorCoord;
 varying vec3 waterPosition;
 varying vec3 waveNormal;
 varying float crest;
 #include <common>
 #include <fog_pars_vertex>
 void wave(vec4 w,vec2 p,float fade,inout vec3 displaced,inout vec3 tangent,inout vec3 bitangent){
  vec2 d=normalize(w.xy);float k=6.28318530718/w.w;
  float phase=k*dot(d,p)-sqrt(9.81*k)*time;
  float steep=w.z*fade;float a=steep/k;float s=sin(phase),c=cos(phase);
  displaced+=vec3(d.x*a*c,a*s,d.y*a*c);
  tangent+=vec3(-d.x*d.x*steep*s,d.x*steep*c,-d.x*d.y*steep*s);
  bitangent+=vec3(-d.x*d.y*steep*s,d.y*steep*c,-d.y*d.y*steep*s);
 }
 void main(){
  vec3 base=(modelMatrix*vec4(position,1.)).xyz;
  vec2 p=base.xz-vec2(0.,travel);
  vec3 displaced=base,tangent=vec3(1.,0.,0.),bitangent=vec3(0.,0.,1.);
  float fade=1.-smoothstep(150.,900.,length(base.xz-cameraPosition.xz));
  wave(vec4(.93,.37,.12,58.),p,1.,displaced,tangent,bitangent);
  wave(vec4(-.35,.94,.10,29.),p,fade,displaced,tangent,bitangent);
  wave(vec4(.62,-.78,.075,16.),p,fade,displaced,tangent,bitangent);
  wave(vec4(.89,.46,.045,8.5),p,fade,displaced,tangent,bitangent);
  waterPosition=displaced;waveNormal=normalize(cross(bitangent,tangent));crest=displaced.y-base.y;
  mirrorCoord=textureMatrix*vec4(displaced,1.);
  vec4 mvPosition=viewMatrix*vec4(displaced,1.);gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
 }`;
 material.fragmentShader=`
 uniform sampler2D mirrorSampler;
 uniform float time;
 uniform float travel;
 uniform vec3 eye;
 uniform vec3 sunDirection;
 uniform vec3 sunColor;
 varying vec4 mirrorCoord;
 varying vec3 waterPosition;
 varying vec3 waveNormal;
 varying float crest;
 #include <common>
 #include <fog_pars_fragment>
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
 void main(){
  vec2 p=waterPosition.xz-vec2(0.,travel);
  vec3 toEye=eye-waterPosition;float distanceToEye=length(toEye);vec3 v=normalize(toEye);
  float rippleFade=1.-smoothstep(45.,290.,distanceToEye);
  float warp=noise(p*.13+time*.08)*2.;
  vec2 ripple=vec2(cos(dot(p,vec2(1.7,.7))+time*2.3+warp),sin(dot(p,vec2(-.8,2.1))-time*1.9+warp))*.07;
  ripple+=vec2(sin(dot(p,vec2(4.2,1.5))-time*3.1),cos(dot(p,vec2(1.3,-3.6))+time*2.7))*.028;
  vec3 n=normalize(waveNormal+vec3(ripple.x,0.,ripple.y)*rippleFade);
  float ndv=max(dot(n,v),.001),ndl=max(dot(n,sunDirection),0.);
  float fresnel=.025+.975*pow(1.-ndv,5.);
  vec2 reflectionUV=mirrorCoord.xy/mirrorCoord.w+n.xz*(.014+1.4/max(distanceToEye,15.));
  vec3 reflection=texture2D(mirrorSampler,clamp(reflectionUV,vec2(.002),vec2(.998))).rgb;
  // Deep blue troughs, translucent green wave crests, and reflected sky/ruins.
  float backlight=pow(max(dot(v,-sunDirection),0.),3.);
  vec3 body=mix(vec3(.014,.095,.12),vec3(.035,.24,.23),smoothstep(-1.,1.6,crest));
  body*=.7+ndl*.55;body+=vec3(.025,.09,.065)*max(crest,0.)*(.4+backlight);
  vec3 halfDirection=normalize(v+sunDirection);
  float ndh=max(dot(n,halfDirection),0.);
  float roughness=.12+(1.-rippleFade)*.06,a2=pow(roughness,4.);
  float denominator=ndh*ndh*(a2-1.)+1.;
  float distribution=a2/(3.14159265*denominator*denominator);
  float sparkle=min(distribution*.018,3.)*ndl;
  float broadGlint=pow(max(dot(reflect(-sunDirection,n),v),0.),28.)*.22;
  vec3 color=mix(body,reflection,clamp(fresnel,.06,.96))+sunColor*(sparkle+broadGlint);
  float foamNoise=noise(p*1.9+vec2(time*.35,-time*.2));
  float foam=smoothstep(1.03,1.63,crest)*smoothstep(.48,.8,foamNoise)*.6;
  foam*=1.-smoothstep(100.,420.,distanceToEye);
  color=mix(color,vec3(.66,.77,.72),foam);
  gl_FragColor=vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
 }`;
 return water;
}
