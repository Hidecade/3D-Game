import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (x,y,z) => new THREE.Vector3(x,y,z);
const palettes = {
 azure: {skin:0x397b7c, belly:0xb5b793, ridge:0x21474e, wing:0x9f634a, horn:0xddd2b0, eye:0x8cffff},
 ivory: {skin:0xd4dedb, belly:0xe9e6d3, ridge:0x182c78, wing:0xb77866, horn:0xe4e2d0, eye:0x7cefff},
 verdant: {skin:0x6f8072, belly:0x9b9d55, ridge:0x3e5045, wing:0x76b2a0, horn:0x9eaa83, eye:0xd8ee54},
 ember: {skin:0x794132, belly:0xc29365, ridge:0x3b2928, wing:0x823c2e, horn:0xc4ac81, eye:0xffbb42},
 moss: {skin:0x536c43, belly:0xb1ad75, ridge:0x293a32, wing:0x6e7043, horn:0xd3c49b, eye:0xffcd65},
 ancient: {skin:0x49403b, belly:0x382d29, ridge:0x241f1c, wing:0x332321, horn:0x54453b, eye:0xffd569},
};

// A small, repeating relief map keeps the scales readable without external assets.
const texels = new Uint8Array(128*128*4);
for(let y=0;y<128;y++)for(let x=0;x<128;x++){
 const row=Math.floor(y/16),u=((x+(row%2)*8)%16)/16,v=(y%16)/16;
 const edge=Math.abs(u-.5)*1.5+Math.abs(v-.43)*.85;
 const relief=Math.max(0,1-edge),n=Math.sin(x*13.3+y*7.1)*.025;
 const shade=Math.round(130+105*relief+n*255);
 const i=(y*128+x)*4;texels[i]=texels[i+1]=texels[i+2]=shade;texels[i+3]=255;
}
const scaleTexture=new THREE.DataTexture(texels,128,128);scaleTexture.wrapS=scaleTexture.wrapT=THREE.RepeatWrapping;
scaleTexture.repeat.set(2,2);scaleTexture.magFilter=THREE.LinearFilter;scaleTexture.minFilter=THREE.LinearMipmapLinearFilter;scaleTexture.generateMipmaps=true;scaleTexture.needsUpdate=true;
const materialCache=new Map();
// Fractured volcanic rock: dark plates separated by thin, hot fissures.
const lavaPixels=new Uint8Array(128*128*4),rockPixels=new Uint8Array(128*128*4);
for(let y=0;y<128;y++)for(let x=0;x<128;x++){
 const u=x+3*Math.sin(y*.17),v=y+4*Math.sin(x*.13);
 const seam=Math.min(Math.abs(Math.sin(u*Math.PI/32)),Math.abs(Math.sin((v+u*.25)*Math.PI/27)));
 const heat=Math.max(0,1-seam/.105),grain=Math.sin(x*32.1+y*17.7)*Math.sin(x*7.9-y*11.3);
 const shade=Math.round(155+grain*32-heat*60),i=(y*128+x)*4;
 rockPixels[i]=rockPixels[i+1]=rockPixels[i+2]=shade;rockPixels[i+3]=255;
 lavaPixels[i]=Math.round(255*heat);lavaPixels[i+1]=Math.round(95*heat*heat);lavaPixels[i+2]=Math.round(8*heat);lavaPixels[i+3]=255;
}
function rockTexture(data){const t=new THREE.DataTexture(data,128,128);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t;}
const volcanicTexture=rockTexture(rockPixels),fissureTexture=rockTexture(lavaPixels);
function getMaterials(kind){
 if(materialCache.has(kind))return materialCache.get(kind);
 const p=palettes[kind];
 const m={skin:new THREE.MeshStandardMaterial({color:p.skin,map:scaleTexture,bumpMap:scaleTexture,bumpScale:.065,roughness:.68}),
 belly:new THREE.MeshStandardMaterial({color:p.belly,roughness:.78}),ridge:new THREE.MeshStandardMaterial({color:p.ridge,map:scaleTexture,bumpMap:scaleTexture,bumpScale:.04,roughness:.8}),
 wing:new THREE.MeshStandardMaterial({color:p.wing,roughness:.86,side:THREE.DoubleSide}),
 vein:new THREE.MeshStandardMaterial({color:p.skin,roughness:.8}),horn:new THREE.MeshStandardMaterial({color:p.horn,roughness:.53}),
 eye:new THREE.MeshStandardMaterial({color:p.eye,emissive:p.eye,emissiveIntensity:1.5,roughness:.2}),
 pupil:new THREE.MeshStandardMaterial({color:0x080e0e,roughness:.3}),mouth:new THREE.MeshStandardMaterial({color:0x30191c,roughness:.85})};
 if(kind==='verdant'){
  m.skin.bumpScale=.11;m.wing.map=scaleTexture;m.wing.bumpMap=scaleTexture;m.wing.bumpScale=.025;m.wing.roughness=.72;
 }
 if(kind==='ancient'){
  for(const key of ['skin','ridge','wing','vein']){
   Object.assign(m[key],{map:volcanicTexture,bumpMap:volcanicTexture,bumpScale:.14,emissiveMap:fissureTexture,emissive:new THREE.Color(0xff7a25),emissiveIntensity:key==='wing'?2:1.1,roughness:.94});
  }
  m.mouth.color.setHex(0xff8b21);m.mouth.emissive.setHex(0xff5708);m.mouth.emissiveIntensity=3;
  m.lava=new THREE.MeshStandardMaterial({color:0xffba3e,emissive:0xff5908,emissiveIntensity:3,roughness:.6});
 }
 materialCache.set(kind,m);return m;
}
function add(group,geometry,material,pos=V(0,0,0),scale){const obj=new THREE.Mesh(geometry,material);obj.position.copy(pos);if(scale)obj.scale.copy(scale);group.add(obj);return obj;}
function oval(g,m,p,s){return add(g,new THREE.SphereGeometry(1,20,12),m,V(...p),V(...s));}
function taper(g,m,points,radii,sides=9,steps=24){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>V(...p)));const frames=curve.computeFrenetFrames(steps,false);
 const vertices=[],uv=[],indices=[];
 for(let i=0;i<=steps;i++){
  const t=i/steps,k=t*(radii.length-1),a=Math.min(Math.floor(k),radii.length-2),r=THREE.MathUtils.lerp(radii[a],radii[a+1],k-a),p=curve.getPointAt(t);
  for(let j=0;j<=sides;j++){const angle=j/sides*Math.PI*2;const q=p.clone().addScaledVector(frames.normals[i],Math.cos(angle)*r).addScaledVector(frames.binormals[i],Math.sin(angle)*r);vertices.push(q.x,q.y,q.z);uv.push(j/sides,t);if(i<steps&&j<sides){const n=i*(sides+1)+j;indices.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1);}}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return add(g,geometry,m);
}
// Bake static anatomy by material; articulated parts retain independent pivots.
function bake(group){
 group.updateMatrixWorld(true);const buckets=new Map();
 for(const child of [...group.children]){
  if(!child.isMesh)continue;const geo=child.geometry.clone().applyMatrix4(child.matrix);if(geo.index){const flat=geo.toNonIndexed();geo.dispose();buckets.set(child.material,[...(buckets.get(child.material)||[]),flat]);}else buckets.set(child.material,[...(buckets.get(child.material)||[]),geo]);
  child.geometry.dispose();group.remove(child);
 }
 for(const [material,geometries] of buckets){const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());add(group,merged,material);}
}
function membrane(group,material,root,boundary){
 const positions=[],uv=[],indices=[],rows=7,columns=boundary.length*5;
 const edge=new THREE.CatmullRomCurve3(boundary.map(p=>V(...p)),false,'catmullrom',.25);
 for(let i=0;i<=rows;i++)for(let j=0;j<=columns;j++){
  const u=j/columns,v=i/rows,p=V(...root).lerp(edge.getPoint(u),v);
  p.y-=Math.sin(v*Math.PI)*Math.sin(u*Math.PI)*.32;
  positions.push(p.x,p.y,p.z);uv.push(u,v);
  if(i<rows&&j<columns){const a=i*(columns+1)+j;indices.push(a,a+1,a+columns+1,a+1,a+columns+2,a+columns+1);}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();add(group,geo,material);
}

export function createDragon({kind='azure',rider=false,ancient=false,slender=false,wingSpan=1,wingDepth=1,referenceStyle=false}={}){
 if(referenceStyle)return createVerdantDragon();
 const root=new THREE.Group();root.name=`${kind}-dragon`;const m=getMaterials(kind);
 const torso=new THREE.Group();root.add(torso);
 if(ancient){root.name='volcanic-armored-dragon';torso.scale.set(1.2,1.15,1.05);}
 oval(torso,m.skin,[0,0,0],[.88,.86,1.8]);oval(torso,m.skin,[0,.13,-.95],[1,.85,1.15]);oval(torso,m.belly,[0,-.4,-.45],[.68,.57,1.55]);
 for(let i=0;i<11;i++)oval(torso,m.belly,[0,-.73+Math.abs(i-5)*.022,-1.4+i*.27],[.61-Math.abs(i-5)*.035,.14,.19]);
 for(let i=0;i<12;i++)taper(torso,m.ridge,[[0,.7,1.5-i*.27],[0,1.12,1.7-i*.27],[0,1.35,1.92-i*.27]],[.16,.1,.005],7,7);
 for(const s of [-1,1]){
  // Shoulder muscles and powerful hind legs, with folded wrists and three toes.
  oval(torso,m.skin,[s*.75,.1,-1],[.48,.59,.9]);
  for(const front of [false,true]){
   const z=front?-1.2:1.05,hip=front?.22:.39;
   taper(torso,m.skin,[[s*.64,-.2,z],[s*(front?.93:1.1),-.75,z+.35],[s*.9,-1.05,z+.9]],[hip,hip*.85,.15],10,14);
   taper(torso,m.skin,[[s*.9,-1.05,z+.9],[s*.72,-1.25,z+.55],[s*.75,-1.3,z+.27]],[.15,.12,.09],9,10);
   for(let toe=0;toe<3;toe++){const x=s*.75+(toe-1)*.13;taper(torso,m.horn,[[x,-1.27,z+.35],[x,-1.35,z+.04],[x,-1.22,z-.11]],[.065,.045,.002],6,6);}
  }
  for(let row=0;row<5;row++)for(let i=0;i<9;i++){const p=oval(torso,m.ridge,[s*(.78-row*.045),.45+row*.075,-1.2+i*.32],[.1,.09,.23]);p.rotation.z=s*-.4;}
 }
 if(ancient){
  // Jagged overlapping basalt shields give the chest and back a heavy silhouette.
  for(let row=0;row<7;row++)for(const side of [-1,1]){
   const z=-1.35+row*.46;
   const plate=add(torso,new THREE.OctahedronGeometry(1),m.skin,V(side*.67,.62,z),V(.5,.35,.48));plate.rotation.z=side*.4;plate.rotation.x=-.25;
   taper(torso,m.horn,[[side*.67,.78,z],[side*.95,1.14,z+.22],[side*1.08,1.4,z+.51]],[.19,.11,.001],6,8);
  }
  for(const side of [-1,1])for(const z of [-.8,1.25]){
   oval(torso,m.skin,[side*.96,-.53,z],[.43,.6,.5]);
   add(torso,new THREE.OctahedronGeometry(1),m.ridge,V(side*1.05,-.6,z-.18),V(.39,.43,.31));
  }
 }
 bake(torso);
 if(slender){
  // Taper the abdomen more than the chest; preserve the upper saddle line.
  torso.traverse(part=>{
   if(!part.isMesh)return;
   const positions=part.geometry.attributes.position;
   for(let i=0;i<positions.count;i++){
    const z=positions.getZ(i),waist=THREE.MathUtils.smoothstep(z,-1.4,.65);
    positions.setX(i,positions.getX(i)*THREE.MathUtils.lerp(.86,.62,waist));
    const y=positions.getY(i);if(y<.1)positions.setY(i,.1+(y-.1)*.76);
   }
   positions.needsUpdate=true;part.geometry.computeVertexNormals();part.geometry.computeBoundingSphere();
  });
 }
 const neck=new THREE.Group();neck.position.set(0,.3,-1.45);root.add(neck);
 taper(neck,m.skin,[[0,0,.2],[0,.3,-.5],[0,.8,-1.15],[0,.9,-1.9]],[.6,.51,.35,.34],16,30);
 taper(neck,m.belly,[[0,-.3,0],[0,.01,-.55],[0,.49,-1.22],[0,.62,-1.9]],[.28,.26,.22,.2],10,20);
 for(let i=0;i<6;i++)taper(neck,m.ridge,[[0,.5+i*.12,-i*.28],[0,.95+i*.1,.1-i*.28],[0,1.14+i*.09,.3-i*.28]],[.14,.075,.002],7,7);
 const head=new THREE.Group();head.position.set(0,.9,-1.95);neck.add(head);
 if(ancient){neck.scale.set(1.22,1.5,1);head.scale.set(.9,.7,.92);}
 oval(head,m.skin,[0,0,0],[.43,.38,.65]);oval(head,m.skin,[0,-.07,-.53],[.34,.24,.53]);oval(head,m.ridge,[0,.08,-.75],[.3,.13,.26]);
 oval(head,m.mouth,[0,-.25,-.47],[.305,.045,.5]);
 const jaw=new THREE.Group();jaw.position.set(0,-.19,-.05);head.add(jaw);oval(jaw,m.skin,[0,-.13,-.45],[.3,.13,.48]);
 for(const s of [-1,1]){
  if(ancient){
   // Narrow, pointed eyes sit beneath a brow that slopes down toward the snout.
   const eye=add(head,new THREE.OctahedronGeometry(1),m.eye,V(s*.397,.095,-.32),V(.055,.038,.17));eye.rotation.x=-.22;
   oval(head,m.pupil,[s*.448,.093,-.34],[.009,.027,.017]);
   taper(head,m.ridge,[[s*.34,.105,-.51],[s*.43,.158,-.3],[s*.39,.21,-.08]],[.045,.055,.045],8,10);
  }else{
   oval(head,m.eye,[s*.365,.1,-.32],[.087,.085,.16]);oval(head,m.pupil,[s*.435,.11,-.35],[.018,.065,.035]);
   taper(head,m.ridge,[[s*.26,.2,-.58],[s*.41,.24,-.3],[s*.4,.22,0]],[.09,.11,.08],8,10);
  }
  oval(head,m.pupil,[s*.18,.09,-.94],[.055,.035,.065]);
  taper(head,m.horn,[[s*.29,.25,.25],[s*.51,.58,.58],[s*.64,.85,.95],[s*.6,1.13,1.15]],[.19,.14,.08,.002],10,22);
  taper(head,m.horn,[[s*.34,-.01,.2],[s*.65,.06,.55],[s*.81,.3,.8]],[.16,.09,.002],9,14);
  for(let i=0;i<5;i++){const z=-.2-i*.145;taper(head,m.horn,[[s*(.26-i*.013),-.19,z],[s*(.24-i*.013),-.37,z-.02]],[i===1?.06:.04,.001],6,4);}
 }
 if(ancient)for(let i=-1;i<=1;i++)taper(head,m.horn,[[i*.23,.25,.02],[i*.44,.82,.07],[i*.5,1.5,.4]],[.17,.12,.003],10,16);
 if(ancient){
  for(let i=0;i<7;i++){
   const u=i/6,y=.1+u*.67,z=-.1-u*1.65;
   oval(neck,m.belly,[0,y-.27,z],[.47-u*.16,.13,.27]);
   for(const side of [-1,1]){
    const plate=add(neck,new THREE.OctahedronGeometry(1),m.skin,V(side*(.45-u*.14),y,z),V(.2,.3,.33));plate.rotation.x=-.35;
   }
  }
  for(const side of [-1,1]){
   add(head,new THREE.OctahedronGeometry(1),m.ridge,V(side*.28,.25,-.35),V(.22,.19,.56));
   taper(head,m.horn,[[side*.24,.02,-.65],[side*.36,.01,-1.02],[side*.4,.08,-1.38]],[.11,.07,.001],6,10);
   taper(head,m.lava,[[side*.25,-.23,-.15],[side*.27,-.24,-.5],[side*.2,-.21,-.91]],[.055,.06,.015],7,12);
   for(let i=0;i<5;i++)taper(jaw,m.horn,[[side*(.25-i*.015),-.04,-.2-i*.15],[side*(.25-i*.015),.12,-.22-i*.15]],[.045,.001],6,5);
  }
  oval(jaw,m.lava,[0,-.015,-.47],[.22,.025,.37]);
 }
 bake(jaw);bake(head);bake(neck);
 const tail=[];let parent=root;
 for(let i=0;i<10;i++){
  const segment=new THREE.Group();segment.position.set(0,i===0?-.03:0,i===0?1.25:.5);parent.add(segment);
  const radius=.47*(slender?.8:1)*Math.pow(1-i/11,1.3);taper(segment,m.skin,[[0,0,-.1],[0,-.015,.27],[0,-.02,.56]],[radius,radius*.9,radius*.8],10,7);
  if(i<8)taper(segment,m.ridge,[[0,radius,.2],[0,radius+.24,.38],[0,radius+.38,.55]],[radius*.3,.055,.001],6,6);
  if(ancient)for(const side of [-1,1])taper(segment,m.horn,[[side*radius*.7,0,.1],[side*(radius+.26),.1,.35],[side*(radius+.4),.14,.65]],[radius*.34,.08,.001],6,7);
  bake(segment);tail.push(segment);parent=segment;
 }
 const wings=[];
 for(const s of [-1,1]){
  const shoulder=new THREE.Group();shoulder.position.set(s*(slender?.6:.7),.35,-.95);shoulder.scale.set(wingSpan,1,wingDepth);root.add(shoulder);
  taper(shoulder,m.skin,[[0,0,0],[s*.8,.2,-.25],[s*1.8,.25,-.4]],[.34,.27,.18],12,18);
  membrane(shoulder,m.wing,[0,-.05,1.4],[[0,0,0],[s*.8,.2,-.25],[s*1.8,.25,-.4],[s*2.2,-.08,1.7],[s*.6,-.1,1.9]]);
  const outer=new THREE.Group();outer.position.set(s*1.8,.25,-.4);shoulder.add(outer);
  const tips=[[s*4.6,.05,.2],[s*3.9,-.08,1.55],[s*2.8,-.14,2.5],[s*1.1,-.17,2.6]];
  const boundary=[[0,0,0],[s*2.2,.19,-.25],tips[0],[s*3.5,-.13,.85],tips[1],[s*2.75,-.24,1.55],tips[2],[s*1.4,-.3,1.78],tips[3],[s*.15,-.16,1.4]];
  membrane(outer,m.wing,[0,0,0],boundary);
  taper(outer,m.skin,[[0,0,0],[s*2.2,.19,-.25],tips[0]],[.18,.105,.014],10,22);
  for(let i=1;i<tips.length;i++)taper(outer,m.vein,[[0,0,0],[tips[i][0]*.52,.05,tips[i][2]*.38],tips[i]],[.075,.04,.007],7,14);
  for(let i=0;i<9;i++){const tip=boundary[2+i%7];taper(outer,m.vein,[[s*.25,0,.2],[tip[0]*.5,-.14,tip[2]*.53],[tip[0]*.86,-.14,tip[2]*.85]],[.012,.009,.002],5,8);}
  taper(outer,m.horn,[[0,0,0],[s*.2,.27,-.22],[s*.26,.46,-.5]],[.12,.07,.001],8,12);
  if(ancient){
   shoulder.scale.set(1.12,1,1.13);
   // Thick rock fingers with exposed molten channels at the wing joints.
   for(const tip of tips){
    taper(outer,m.ridge,[[0,.055,0],[tip[0]*.52,.13,tip[2]*.38],tip],[.14,.095,.012],7,16);
    taper(outer,m.lava,[[s*.12,.18,.05],[tip[0]*.3,.2,tip[2]*.22],[tip[0]*.64,.15,tip[2]*.54]],[.042,.028,.001],6,12);
   }
   oval(outer,m.lava,[0,.14,0],[.18,.09,.17]);
   for(let i=0;i<4;i++)add(shoulder,new THREE.OctahedronGeometry(1),m.skin,V(s*(.25+i*.4),.23,-.1-i*.06),V(.33,.17,.38));
  }
  bake(outer);bake(shoulder);wings.push({shoulder,outer,side:s});
 }
 let scarf=null;
 if(rider){
  const saddle=new THREE.Group();root.add(saddle);const leather=new THREE.MeshStandardMaterial({color:0x493326,roughness:.9});
  oval(saddle,leather,[0,.81,-.05],[.42,.14,.6]);oval(saddle,m.ridge,[0,1.19,-.04],[.24,.36,.24]);oval(saddle,m.horn,[0,1.68,-.13],[.22,.25,.22]);
  for(const s of [-1,1]){taper(saddle,leather,[[s*.17,1.13,0],[s*.49,.8,-.03],[s*.58,.35,.17]],[.14,.13,.095],8,12);taper(saddle,m.belly,[[s*.2,1.39,-.06],[s*.3,1.1,-.4],[s*.25,1.04,-.72]],[.075,.07,.06],8,10);}
  scarf=new THREE.Group();scarf.position.set(0,1.48,.08);saddle.add(scarf);membrane(scarf,m.wing,[0,0,0],[[.13,0,.05],[.15,.03,.6],[-.1,-.05,1.45],[-.12,-.02,.6]]);bake(saddle);
 }
 const mouth=new THREE.Object3D();mouth.position.set(0,-.22,-1.03);head.add(mouth);
 root.userData.rig={wings,tail,neck,jaw,scarf,mouth,ancient};return root;
}

// Reference-inspired grey-green scales, tall armored neck and turquoise membranes.
function createVerdantDragon(){
 const root=new THREE.Group();root.name='verdant-crested-dragon';const m=getMaterials('verdant');
 const legs=[];
 const body=new THREE.Group();root.add(body);
 taper(body,m.ridge,[[0,.35,-1.3],[0,.05,-.55],[0,-.12,.35],[0,-.17,1.45]],[.42,.4,.27,.23],14,24);
 oval(body,m.skin,[0,.3,-.93],[.52,.56,.75]);
 for(const s of [-1,1]){
  // Overlapping olive belly plates follow the narrow torso.
  for(let i=0;i<5;i++){
   const plate=oval(body,i%2?m.belly:m.skin,[s*(.35-i*.04),.16-i*.09,-.85+i*.44],[.16,.33-i*.026,.4]);
   plate.rotation.z=s*-.4;plate.rotation.x=-.28;
  }
  // Faceted shoulder shields frame the saddle and sweep back toward the tail.
  const shield=add(body,new THREE.OctahedronGeometry(1),m.skin,V(s*.4,.43,-.65),V(.19,.14,.72));
  shield.rotation.z=-s*.28;shield.rotation.y=s*.18;
  // Compact folded limbs keep the silhouette light under the narrow torso.
  const hind=new THREE.Group(),fore=new THREE.Group();
  taper(hind,m.skin,[[s*.25,-.15,.8],[s*.46,-.43,.98],[s*.49,-.7,1.15]],[.18,.15,.1],10,16);
  taper(hind,m.ridge,[[s*.49,-.7,1.15],[s*.42,-.92,1.26],[s*.3,-1.18,1.39]],[.1,.065,.028],9,17);
  for(let j=0;j<2;j++)taper(hind,m.ridge,[[s*.3,-1.15,1.39],[s*(.3+j*.09),-1.29,1.48],[s*(.26+j*.12),-1.34,1.57]],[.03,.02,.001],6,8);
  taper(fore,m.ridge,[[s*.38,.05,-.94],[s*.48,-.23,-.79],[s*.43,-.46,-.58]],[.11,.075,.025],8,14);
  for(const [joint,pivot,front] of [[hind,V(s*.25,-.15,.8),false],[fore,V(s*.38,.05,-.94),true]]){
   // Rotate around the attachment, keeping each limb connected to the body.
   for(const child of joint.children)child.position.sub(pivot);
   bake(joint);joint.position.copy(pivot);root.add(joint);legs.push({joint,side:s,front});
  }
 }
 // Layered scales frame the saddle, with a spined crest behind it.
 for(let i=0;i<6;i++){
  const z=-.08+i*.28,y=.3-i*.037,width=.23-i*.018;
  for(const side of [-1,1]){
   const plate=add(body,new THREE.OctahedronGeometry(1),i%2?m.belly:m.skin,V(side*width*.6,y,z),V(width,.105,.29));
   plate.rotation.z=-side*.2;plate.rotation.y=side*.22;
  }
  taper(body,m.ridge,[[0,y-.035,z-.11],[0,y+.14-i*.009,z+.04],[0,y+.025,z+.25]],[.065,.045,.002],7,10);
 }
 for(let i=0;i<4;i++){
  const z=.2+i*.34;
  taper(body,m.horn,[[0,.26,z],[0,.78-i*.06,z+.22],[0,.96-i*.1,z+.44]],[.095,.055,.001],8,12);
  membrane(body,m.wing,[0,.25,z],[[0,.3,z+.1],[0,.9-i*.1,z+.42],[0,.24,z+.57]]);
 }
 bake(body);
 const neck=new THREE.Group();neck.position.set(0,.45,-1.45);root.add(neck);
 taper(neck,m.skin,[[0,0,.15],[0,.65,-.32],[0,1.28,-.7],[0,1.62,-1.4]],[.4,.34,.28,.24],14,32);
 for(let i=0;i<9;i++){
  const u=i/8,y=.12+u*1.5,z=-.17-u*1.33;
  const plate=oval(neck,m.belly,[0,y-.12,z-.15],[.31-u*.085,.14,.2]);plate.rotation.x=-.48;
  for(const side of [-1,1]){
   const scale=add(neck,new THREE.OctahedronGeometry(1),m.skin,V(side*(.29-u*.07),y,z+.06),V(.1,.21,.24));scale.rotation.x=-.4;
  }
  if(i%2===0){
   taper(neck,m.horn,[[0,y+.18,z+.2],[0,y+.48,z+.5],[0,y+.64,z+.8]],[.09,.065,.001],8,12);
   membrane(neck,m.wing,[0,y+.05,z+.18],[[0,y+.17,z+.24],[0,y+.61,z+.78],[0,y+.04,z+.6]]);
  }
 }
 const head=new THREE.Group();head.position.set(0,1.64,-1.47);neck.add(head);
 oval(head,m.skin,[0,0,0],[.34,.29,.46]);
 taper(head,m.skin,[[0,-.02,-.2],[0,-.08,-.65],[0,-.06,-.97]],[.29,.23,.13],12,20);
 oval(head,m.mouth,[0,-.145,-.53],[.2,.055,.39]);
 const jaw=new THREE.Group();jaw.position.set(0,-.32,-.03);head.add(jaw);taper(jaw,m.skin,[[0,0,0],[0,-.04,-.5],[0,0,-.88]],[.18,.15,.08],10,16);
 for(const s of [-1,1]){
  oval(head,m.eye,[s*.302,.06,-.2],[.045,.062,.095]);
  oval(head,m.pupil,[s*.34,.065,-.23],[.012,.047,.022]);
  taper(head,m.ridge,[[s*.24,.18,-.42],[s*.32,.17,-.17],[s*.32,.24,.08]],[.065,.07,.015],8,12);
  taper(head,m.horn,[[s*.23,.2,.1],[s*.4,.56,.38],[s*.46,1.04,.68]],[.14,.085,.001],10,20);
  taper(head,m.horn,[[s*.25,.02,.16],[s*.55,.23,.51],[s*.69,.55,.74]],[.11,.065,.001],9,15);
  membrane(head,m.wing,[s*.2,.13,.15],[[s*.3,.33,.28],[s*.45,.94,.64],[s*.48,.45,.48],[s*.67,.53,.72],[s*.45,.04,.43]]);
  oval(head,m.pupil,[s*.115,.055,-.86],[.034,.023,.041]);
  for(let i=0;i<5;i++){
   const z=-.28-i*.13,x=s*(.19-i*.012);
   taper(head,m.horn,[[x,-.23,z],[x,-.34-(i%2)*.035,z-.025]],[.035,.001],6,6);
   taper(jaw,m.horn,[[x,.1,z],[x,.2,z-.02]],[.025,.001],6,6);
  }
 }
 bake(jaw);bake(head);bake(neck);
 const tail=[];let parent=root;
 for(let i=0;i<11;i++){
  const segment=new THREE.Group();segment.position.set(0,i===0?-.16:0,i===0?1.35:.56);parent.add(segment);
  const radius=.25*Math.pow(1-i/12,1.05);
  taper(segment,i<3&&i%2===0?m.skin:m.ridge,[[0,0,-.04],[0,0,.3],[0,0,.61]],[radius,radius*.92,radius*.8],10,9);
  if(i<8)taper(segment,m.horn,[[0,radius*.6,.1],[0,radius+.25-i*.02,.37],[0,radius*.6,.58]],[.07,.04,.001],8,10);
  if(i===10)taper(segment,m.ridge,[[0,0,.25],[0,0,.87],[0,.02,1.4]],[.055,.03,.001],8,14);
  bake(segment);tail.push(segment);parent=segment;
 }
 const wings=[];
 for(const s of [-1,1]){
  const shoulder=new THREE.Group();shoulder.position.set(s*.43,.53,-1.05);shoulder.scale.z=1.3;root.add(shoulder);
  const wrist=[s*2.7,1.05,-.75];
  taper(shoulder,m.ridge,[[0,0,0],[s*1.1,.51,-.52],wrist],[.15,.11,.075],10,18);
  membrane(shoulder,m.wing,[0,0,.7],[[0,0,0],[s*1.1,.51,-.52],wrist,[s*2.17,.36,.6],[s*1.46,-.06,.92],[s*.75,-.14,.35]]);
  taper(shoulder,m.skin,[[0,.03,0],[s*.92,.44,-.4],[s*1.62,.69,-.56]],[.09,.075,.02],8,14);
  const outer=new THREE.Group();outer.position.set(...wrist);shoulder.add(outer);
  const tips=[[s*7.65,-1.38,1.06],[s*5.15,-.83,2.18],[s*2.92,-.38,2.16],[s*.76,-.37,1.47]];
  const edge=[[0,0,0],[s*1.27,.03,-.18],[s*3.72,-.34,.12],[s*5.72,-.86,.48],tips[0],[s*5.5,-.66,1.34],tips[1],[s*3.9,-.28,1.1],tips[2],[s*1.67,-.18,.81],tips[3],[0,-.41,.79]];
  membrane(outer,m.wing,[0,0,0],edge);
  taper(outer,m.ridge,[[0,0,0],[s*1.27,.03,-.18],[s*3.72,-.34,.12],[s*5.72,-.86,.48],tips[0]],[.08,.074,.055,.03,.001],9,30);
  // Scaled finger bones separate the broad turquoise membranes.
  for(let i=1;i<tips.length;i++)taper(outer,m.ridge,[[0,0,0],[tips[i][0]*.48,-.1,tips[i][2]*.36],tips[i]],[.055,.037,.008],7,16);
  for(let i=4;i<edge.length-1;i++)taper(outer,m.ridge,[edge[i],edge[i+1]],[.019,.014],6,5);
  taper(outer,m.ridge,[[0,0,0],[s*.11,.23,-.19],[s*.17,.35,-.43]],[.065,.046,.001],7,10);
  bake(outer);bake(shoulder);wings.push({shoulder,outer,side:s});
 }
 const mouth=new THREE.Object3D();mouth.position.set(0,-.12,-1.04);head.add(mouth);
 root.userData.rig={wings,tail,legs,neck,jaw,scarf:null,mouth,ancient:false,referenceStyle:true};return root;
}

export function animateDragon(root,time,{bank=0,breathing=false,aimTarget=null,motion=null,dt=1/60}={}){
 const rig=root.userData.rig,rate=rig.ancient?2.35:rig.referenceStyle?2.7:3.7;
 let phase=time*rate,effort=0,turn=0,lift=0;
 if(motion){
  const state=rig.wingMotion ||= {phase,x:0,y:0,effort:0,burst:0,lastX:0,lastY:0};
  const x=THREE.MathUtils.clamp(motion.x,-1,1),y=THREE.MathUtils.clamp(motion.y,-1,1);
  // A new stroke gives changes of direction weight, then settles into cruising.
  const change=Math.hypot(x-state.lastX,y-state.lastY);
  state.burst=Math.max(state.burst*Math.exp(-dt*3.5),Math.min(1,change*.8));
  state.lastX=x;state.lastY=y;
  state.x=THREE.MathUtils.damp(state.x,x,9,dt);state.y=THREE.MathUtils.damp(state.y,y,9,dt);
  const target=Math.min(1,Math.hypot(x,y)*.65+state.burst*.7);
  state.effort=THREE.MathUtils.damp(state.effort,target,target>state.effort?12:3.5,dt);
  state.phase+=dt*rate*(1+state.effort*1.65);
  phase=state.phase;effort=state.effort;turn=state.x;lift=state.y;
 }
 const flap=Math.sin(phase);
 for(const {shoulder,outer,side} of rig.wings){
  // The outside wing makes a deeper stroke; both wings lean into the turn.
  const amplitude=(rig.referenceStyle?.11:.31)+effort*.38-side*turn*.085;
  shoulder.rotation.z=side*((rig.referenceStyle?0:.12)+flap*amplitude)+bank*.1-turn*.24;
  shoulder.rotation.x=Math.cos(phase)*((rig.referenceStyle?.025:.065)+effort*.1)+lift*.14;
  outer.rotation.z=side*(Math.sin(phase-.65)*((rig.referenceStyle?.075:.19)+effort*.24)-.04)-turn*.12;
  outer.rotation.y=side*(.04+Math.cos(phase)*(.08+effort*.12)+lift*.1)+turn*.12;
 }
 rig.tail.forEach((part,i)=>{part.rotation.y=rig.referenceStyle?.035+Math.sin(time*1.5-i*.36)*.023-bank*.035:Math.sin(time*2.6-i*.43)*(.045+i*.008)-bank*.045;part.rotation.x=rig.referenceStyle?-.058+Math.sin(time*1.6-i*.29)*.016:.022+Math.sin(time*1.7-i*.25)*.018;});
 if(motion){
  const flow=rig.wingMotion.tailFlow ||= rig.tail.map(()=>({x:0,y:0}));
  // Travel down the tail over time, instead of bending all joints together.
  for(let i=flow.length-1;i>=0;i--){
   const target=i?flow[i-1]:{x:turn,y:lift};
   flow[i].x=THREE.MathUtils.damp(flow[i].x,target.x,15,dt);
   flow[i].y=THREE.MathUtils.damp(flow[i].y,target.y,15,dt);
   rig.tail[i].rotation.y-=flow[i].x*(.14-i*.005);
   rig.tail[i].rotation.x+=flow[i].y*(.095-i*.003);
  }
 }
 // A positive local X angle lowers the +Z-pointing tail. Keep each joint
 // at or below the body's horizontal plane, even during upward steering.
 if(rig.referenceStyle)for(let i=0;i<rig.tail.length;i++){
  const sway=motion?rig.wingMotion.tailFlow[i].y:0;
  rig.tail[i].rotation.x=THREE.MathUtils.clamp(.018+Math.sin(time*1.6-i*.29)*.008+sway*(.035-i*.001),0,.065);
 }
 for(const {joint,front,side} of rig.legs||[]){
  joint.rotation.z=turn*(front?.32:.52);
  joint.rotation.x=lift*(front?.3:.42)+effort*.08;
  joint.rotation.y=-turn*.16+side*effort*.035;
 }
 if(aimTarget){
  // The neck takes up the small remaining error while the heavier body turns.
  const localAim=aimTarget.clone().sub(root.position).applyQuaternion(root.quaternion.clone().invert()).sub(rig.neck.position).normalize();
  const pitch=THREE.MathUtils.clamp(Math.atan2(localAim.y,Math.hypot(localAim.x,localAim.z)),-.3,.3);
  const yaw=THREE.MathUtils.clamp(-Math.atan2(localAim.x,-localAim.z),-.42,.42);
  rig.neck.rotation.x=THREE.MathUtils.damp(rig.neck.rotation.x,pitch,18,dt);
  rig.neck.rotation.y=THREE.MathUtils.damp(rig.neck.rotation.y,yaw,18,dt);
 }else{rig.neck.rotation.x=Math.sin(phase-.4)*.026;rig.neck.rotation.y=Math.sin(time*.7)*.035;}
 rig.jaw.rotation.x=rig.ancient?(breathing?-.42:-.23)+Math.sin(time*1.7)*.025:rig.referenceStyle?-.12+Math.sin(time*1.7)*.025:breathing?.28:.035+Math.sin(time*1.7)*.025;
 if(rig.scarf)rig.scarf.rotation.y=Math.sin(time*7)*.17;
}

export function dragonMouth(root){root.updateWorldMatrix(true,true);return root.userData.rig.mouth.getWorldPosition(new THREE.Vector3());}
