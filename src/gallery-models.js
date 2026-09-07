import { createDragon, animateDragon } from './dragons.js';
import { createRider } from './rider.js';
import { createSkyBeast } from './sky-beasts.js';
import { createSkyInsect, animateSkyInsect } from './sky-insects.js';
import { createCentipede, animateCentipede } from './centipede.js';
import { createWarship } from './warships.js';

export const galleryModels=[
 {name:'自機のドラゴン ＋ 騎手',description:'灰緑の鱗と青緑の翼を持つ竜に、金髪の騎手が乗る。',create(){const model=createDragon({referenceStyle:true});model.add(createRider());return model;},animate:animateDragon},
 {name:'自機のドラゴン',description:'長い装甲の首、頭の角とひれ、黄色い瞳を持つ灰緑の竜。',create:()=>createDragon({referenceStyle:true}),animate:animateDragon},
 {name:'女性の騎手',description:'金髪のポニーテールと青い瞳を持つ、竜の背から銃で戦う騎手。',create:createRider},
 {name:'鷲型獣 ／ 茶金',description:'大きな羽毛の翼と鋭い目を持つ飛行獣。',create:()=>createSkyBeast({kind:'amber'}),animate:animateDragon},
 {name:'鷲型獣 ／ 青灰',description:'青灰色の羽毛を持つ鷲型獣の別個体。',create:()=>createSkyBeast({kind:'storm'}),animate:animateDragon},
 {name:'四翅の飛行昆虫',description:'金色の翅脈、装甲の節、大顎を持つ空中の昆虫。',create:createSkyInsect,animate:animateSkyInsect},
 {name:'中ボス ／ 飛行ムカデ',description:'16の体節と多数の脚を持つ、巨大な飛行生物。',create(){const model=createCentipede();animateCentipede(model,12);return model;}},
 {name:'最終ボス ／ 古竜アシュガル',description:'黒い岩の装甲に溶岩の亀裂が走り、口と翼が灼熱に輝く巨大な古竜。',create:()=>createDragon({kind:'ancient',ancient:true}),animate:animateDragon},
 {name:'木製の小型戦艦',description:'古い木の船体に、鉄製の連装砲を備えた船。',create:createWarship},
];
