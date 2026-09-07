import { createDragon, animateDragon } from './dragons.js';
import { createRider } from './rider.js';
import { createSkyBeast } from './sky-beasts.js';
import { createSkyInsect, animateSkyInsect } from './sky-insects.js';
import { createCentipede, animateCentipede } from './centipede.js';
import { createWarship } from './warships.js';

export const galleryModels=[
 {name:'自機のドラゴン ＋ 騎手',description:'蒼海を飛ぶ白い竜と女性の騎手。',create(){const model=createDragon({referenceStyle:true});model.add(createRider());return model;},animate:animateDragon},
 {name:'自機のドラゴン',description:'広い翼と細身の胴体を持つ、蒼と白の竜。',create:()=>createDragon({referenceStyle:true}),animate:animateDragon},
 {name:'女性の騎手',description:'竜の背から銃で戦う、ポニーテールの騎手。',create:createRider},
 {name:'鷲型獣 ／ 茶金',description:'大きな羽毛の翼と鋭い目を持つ飛行獣。',create:()=>createSkyBeast({kind:'amber'}),animate:animateDragon},
 {name:'鷲型獣 ／ 青灰',description:'青灰色の羽毛を持つ鷲型獣の別個体。',create:()=>createSkyBeast({kind:'storm'}),animate:animateDragon},
 {name:'四翅の飛行昆虫',description:'金色の翅脈、装甲の節、大顎を持つ空中の昆虫。',create:createSkyInsect,animate:animateSkyInsect},
 {name:'中ボス ／ 飛行ムカデ',description:'16の体節と多数の脚を持つ、巨大な飛行生物。',create(){const model=createCentipede();animateCentipede(model,12);return model;}},
 {name:'最終ボス ／ 古竜アシュガル',description:'海上の聖域と地底湖の奥に現れる古代の守護者。',create:()=>createDragon({kind:'ancient',ancient:true}),animate:animateDragon},
 {name:'木製の小型戦艦',description:'古い木の船体に、鉄製の連装砲を備えた船。',create:createWarship},
];
