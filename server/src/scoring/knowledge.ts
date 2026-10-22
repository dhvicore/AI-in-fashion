import { prisma } from '../lib/db.js';
import type { Prisma } from '@prisma/client';
export const VERSION = 'divara-context-v4';
export const STYLES = ['Minimal','Casual','Chic','Streetwear','Formal','Sporty','Vintage'] as const;
export const OCCASIONS = ['College','Office','Date','Party','Wedding','Travel','Casual','Formal','Interview','Workout','Outdoor'] as const;
export const WEATHER = ['Any','Hot','Warm','Cool','Cold','Rainy'] as const;
export const SOURCES = [
  {id:'post-attire',title:'Emily Post: Attire guide',url:'https://emilypost.com/advice/attire-guide-dress-codes-from-casual-to-white-tie',summary:'Casual, dressy casual, business and formal dress codes describe different levels of dress. Follow the invitation or workplace policy.',checkedAt:'2026-10-12'},
  {id:'post-business',title:'Emily Post: Business casual',url:'https://emilypost.com/advice/business-casual-attire-guide',summary:'Business casual depends on the workplace. Check its policy rather than treating every office alike.',checkedAt:'2026-10-12'},
  {id:'rei-layers',title:'REI: Layering basics',url:'https://www.rei.com/learn/expert-advice/layering-basics.html',summary:'For outdoor activity, base layers manage moisture, middle layers retain warmth and shells protect against wind and rain. Adjust layers to activity and conditions.',checkedAt:'2026-10-12'},
  {id:'rei-heat',title:'REI: Hot-weather clothing',url:'https://www.rei.com/learn/expert-advice/hot-weather-hiking.html',summary:'For hot outdoor conditions, consider lightweight, loose, breathable clothing, lighter colours and sun coverage. Fabric choice depends on moisture and changing conditions.',checkedAt:'2026-10-12'},
];
export interface GarmentGuide { key:string; title:string; category:string; aliases:string[]; styles:string[]; weather:Record<string,number> }
// The taxonomy, style affinities and numbers are demo design choices, not
// statistics from the sources. Users confirm the style of their actual piece.
const garment = (key:string,title:string,category:string,aliases:string[],styles:string[],heat:number,cold:number,rain=65):GarmentGuide => ({key,title,category,aliases,styles,weather:{Hot:heat,Warm:Math.min(100,heat+10),Cool:85,Cold:cold,Rainy:rain}});
export const GARMENTS:GarmentGuide[] = [
 garment('tee','T-shirt','Tops',['t-shirt','t shirt','tshirt','tee'],['Casual','Minimal','Streetwear'],90,45),
 garment('shirt','Shirt','Tops',['shirt','button-down','button down'],['Minimal','Formal','Casual'],85,55),
 garment('blouse','Blouse','Tops',['blouse'],['Chic','Formal','Vintage'],85,50),
 garment('polo','Polo shirt','Tops',['polo'],['Casual','Minimal'],85,50),
 garment('tank','Tank top','Tops',['tank','camisole','sleeveless top'],['Casual','Sporty','Streetwear'],95,25),
 garment('top','Top (general)','Tops',['top'],['Casual','Minimal','Chic'],80,50),
 garment('sweater','Sweater','Tops',['sweater','jumper','knitwear','turtleneck'],['Minimal','Vintage','Casual'],35,90),
 garment('hoodie','Hoodie / sweatshirt','Tops',['hoodie','sweatshirt'],['Streetwear','Sporty','Casual'],35,85),
 garment('kurta','Kurta','Tops',['kurta'],['Casual','Chic','Formal'],80,55),
 garment('jeans','Jeans','Bottoms',['jeans','denim pants','denim trousers'],['Casual','Streetwear','Vintage'],60,75),
 garment('trousers','Trousers / chinos','Bottoms',['trousers','chinos','slacks','khakis','pants'],['Minimal','Formal','Casual'],75,70),
 garment('shorts','Shorts','Bottoms',['shorts'],['Casual','Sporty','Streetwear'],95,20),
 garment('skirt','Skirt','Bottoms',['skirt'],['Chic','Minimal','Vintage'],85,45),
 garment('leggings','Leggings / joggers','Bottoms',['leggings','joggers','track pants','sweatpants'],['Sporty','Casual','Streetwear'],75,65),
 garment('dress','Dress','Dresses',['dress'],['Chic','Minimal','Vintage','Formal'],85,45),
 garment('gown','Evening gown','Dresses',['gown'],['Formal','Chic'],70,45),
 garment('jumpsuit','Jumpsuit','Dresses',['jumpsuit','romper'],['Chic','Casual','Minimal'],80,50),
 garment('saree','Saree','Dresses',['saree','sari'],['Formal','Chic','Vintage'],75,50),
 garment('blazer','Blazer / suit jacket','Outerwear',['blazer','suit jacket','sport coat'],['Formal','Minimal','Chic'],45,75),
 garment('raincoat','Rain shell','Outerwear',['raincoat','rain jacket','waterproof jacket','rain shell'],['Casual','Sporty'],55,65,100),
 garment('coat','Coat','Outerwear',['coat','trench','parka','puffer'],['Minimal','Formal','Chic','Vintage'],20,95,65),
 garment('cardigan','Cardigan','Outerwear',['cardigan'],['Minimal','Vintage','Casual'],45,85),
 garment('jacket','Jacket','Outerwear',['jacket'],['Casual','Streetwear','Sporty'],45,80),
 garment('sneakers','Sneakers / trainers','Shoes',['sneakers','sneaker','trainers','trainer'],['Casual','Sporty','Streetwear','Minimal'],85,65),
 garment('loafers','Loafers / dress shoes','Shoes',['loafers','loafer','oxford','derby','dress shoes'],['Formal','Minimal','Vintage'],80,65),
 garment('sandals','Sandals','Shoes',['sandals','sandal','slides','flip-flops'],['Casual','Chic'],95,20,40),
 garment('boots','Boots','Shoes',['boots','boot'],['Vintage','Streetwear','Formal'],40,90,70),
 garment('heels','Heels / flats','Shoes',['heels','heel','flats','pumps'],['Chic','Formal','Vintage'],80,45,45),
 garment('shoes','Shoes (general)','Shoes',['shoes','shoe'],['Casual','Minimal'],75,60),
 garment('scarf','Scarf','Accessories',['scarf'],['Vintage','Minimal','Chic'],40,85),
 garment('hat','Hat / cap','Accessories',['hat','cap'],['Casual','Sporty','Vintage'],90,70),
 garment('bag','Bag / handbag','Accessories',['bag','handbag','purse','clutch','backpack','tote'],['Minimal','Chic','Formal','Casual'],85,85),
 garment('belt','Belt','Accessories',['belt'],['Minimal','Formal','Casual'],85,85),
 garment('watch','Watch','Accessories',['watch','wristwatch'],['Minimal','Formal','Casual'],85,85),
 garment('earrings','Earrings','Accessories',['earrings','earring','studs','hoops'],['Chic','Formal','Minimal','Vintage'],85,85),
 garment('necklace','Necklace','Accessories',['necklace','pendant','chain','choker'],['Chic','Formal','Minimal','Vintage'],85,85),
 garment('bracelet','Bracelet / bangle','Accessories',['bracelet','bangle','bangles'],['Chic','Formal','Minimal','Vintage'],85,85),
 garment('ring','Ring','Accessories',['ring','rings'],['Chic','Formal','Minimal','Vintage'],85,85),
 garment('sunglasses','Sunglasses','Accessories',['sunglasses'],['Minimal','Casual','Chic'],95,70),
 garment('accessory','Accessory','Accessories',['socks','sock','accessory','jewellery','jewelry'],['Minimal','Casual','Chic'],80,70),
];
const OCCASION_DATA:Record<string,{recommended:string[];avoid:string[];note:string;sourceIds:string[]}> = {
 College:{recommended:['tee','shirt','polo','top','jeans','trousers','kurta','sneakers','cardigan'],avoid:['skirt','dress','gown','shorts','tank','saree'],note:'Campus preset excludes skirts, dresses and shorts as requested for this project; adapt it to your college dress code.',sourceIds:[]},
 Office:{recommended:['shirt','blouse','polo','trousers','skirt','dress','blazer','loafers','heels','cardigan','kurta'],avoid:['shorts','tank','leggings','sandals'],note:'Business-casual example. Your workplace policy takes priority.',sourceIds:['post-business']},
 Date:{recommended:['shirt','blouse','top','jeans','trousers','skirt','dress','jumpsuit','blazer','loafers','heels','sneakers'],avoid:[],note:'Dressy-casual example for dinner; change the occasion for a different venue.',sourceIds:['post-attire']},
 Party:{recommended:['shirt','blouse','top','trousers','skirt','dress','jumpsuit','blazer','loafers','heels'],avoid:[],note:'Dressy-casual gathering example, not every party dress code.',sourceIds:['post-attire']},
 Wedding:{recommended:['shirt','blouse','trousers','skirt','dress','gown','saree','kurta','blazer','loafers','heels'],avoid:['tee','jeans','shorts','hoodie','leggings','tank','sneakers','sandals'],note:'Dressy wedding example; invitation and local traditions override it. Saree/kurta options are Divara additions, not rules from Emily Post.',sourceIds:['post-attire']},
 Travel:{recommended:['tee','shirt','top','jeans','trousers','leggings','jumpsuit','sneakers','sandals','jacket','cardigan'],avoid:[],note:'Comfort-oriented travel example; destination and activity matter.',sourceIds:[]},
 Casual:{recommended:['tee','shirt','polo','tank','top','hoodie','jeans','trousers','shorts','skirt','dress','kurta','sneakers','sandals','jacket','cardigan'],avoid:[],note:'Relaxed everyday outing example; personal preference takes priority.',sourceIds:['post-attire']},
 Formal:{recommended:['shirt','blouse','trousers','skirt','dress','gown','saree','kurta','blazer','loafers','heels'],avoid:['tee','hoodie','jeans','shorts','leggings','tank','sandals','sneakers'],note:'Formal-event example. Confirm the invitation; traditional garments are supported as editorial alternatives.',sourceIds:['post-attire']},
 Interview:{recommended:['shirt','blouse','trousers','skirt','dress','blazer','loafers','heels','kurta'],avoid:['tee','hoodie','shorts','leggings','tank','sandals'],note:'Conservative business-attire example; check the employer’s expectations.',sourceIds:['post-attire','post-business']},
 Workout:{recommended:['tee','tank','leggings','shorts','sneakers','hoodie'],avoid:['shirt','blouse','kurta','jeans','trousers','skirt','dress','gown','jumpsuit','saree','blazer','heels','loafers','sandals'],note:'Divara activity example; review fabric and movement comfort yourself.',sourceIds:[]},
 Outdoor:{recommended:['tee','shirt','trousers','shorts','leggings','sneakers','boots','raincoat','jacket','hat','sweater'],avoid:['gown','heels','loafers'],note:'Outdoor layering example. Garment names do not prove waterproofing or fabric performance.',sourceIds:['rei-layers','rei-heat']},
};
const WEATHER_DATA:Record<string,{note:string;sourceIds:string[]}> = {
 Hot:{note:'Consider light, breathable clothing, sun coverage and removable layers. Fabric performance needs confirmation.',sourceIds:['rei-heat']},
 Warm:{note:'Choose comfortable lighter layers; adapt to your activity and comfort.',sourceIds:['rei-heat','rei-layers']},
 Cool:{note:'Consider an adjustable middle or outer layer for comfort.',sourceIds:['rei-layers']},
 Cold:{note:'Consider insulating layers and weather protection; a photo does not verify warmth.',sourceIds:['rei-layers']},
 Rainy:{note:'Consider a rain shell; check actual waterproofing and footwear suitability.',sourceIds:['rei-layers']},
};
// How dressed-up each garment and occasion is (0 very casual … 100 black-tie).
// These let us estimate how *typical* a garment is for an occasion instead of a
// flat recommended/neutral/avoid bucket, which made every score look alike.
const GARMENT_FORMALITY:Record<string,number> = {
 tee:22,shirt:66,blouse:70,polo:48,tank:20,top:46,sweater:50,hoodie:20,kurta:64,
 jeans:34,trousers:68,shorts:16,skirt:62,leggings:24,
 dress:72,gown:96,jumpsuit:60,saree:86,
 blazer:86,raincoat:40,coat:70,cardigan:54,jacket:44,
 sneakers:34,loafers:82,sandals:26,boots:56,heels:84,shoes:52,
 scarf:52,hat:34,accessory:50,
};
const OCCASION_FORMALITY:Record<string,number> = {
 College:38,Office:72,Date:58,Party:60,Wedding:88,Travel:34,Casual:28,Formal:92,Interview:84,Workout:22,Outdoor:30,
};
const clampInt=(min:number,value:number,max:number)=>Math.max(min,Math.min(max,Math.round(value)));
// Typicality of a garment for an occasion (0–96), from the formality gap plus the
// occasion's own recommended / avoid lists. Underdressing is penalised more than
// overdressing, so sneakers at a wedding score low while a blazer stays high.
function typicality(occasion:string, key:string):number {
 const occF=OCCASION_FORMALITY[occasion]??50, gF=GARMENT_FORMALITY[key]??50;
 const under=Math.max(0,occF-gF), over=Math.max(0,gF-occF);
 const base=100-under*1.0-over*0.5;
 const rule=OCCASION_DATA[occasion];
 if(rule?.avoid.includes(key)) return clampInt(8,base*0.35,30);
 if(rule?.recommended.includes(key)) return clampInt(80,base+8,96);
 return clampInt(45,base,86);
}
// occasion -> garmentKey -> typicality. Treated as a small learned lookup table.
function buildFrequency():Record<string,Record<string,number>> {
 const table:Record<string,Record<string,number>>={};
 for(const occasion of OCCASIONS){
  table[occasion]={};
  for(const g of GARMENTS) table[occasion][g.key]=typicality(occasion,g.key);
 }
 return table;
}
const FREQUENCY=buildFrequency();
let seed:Promise<void>|undefined;
export function ensureKnowledge() {
 seed ??= (async()=>{
  await prisma.$transaction(async tx=>{
   for(const source of SOURCES) await tx.guidanceSource.upsert({where:{id:source.id},create:source,update:{}});
   const rows = [
    ...GARMENTS.map(g=>({kind:'garment',key:g.key,title:g.title,summary:'Editable garment taxonomy. Style affinities and weather scores are Divara heuristics; confirm the actual piece.',data:g,sourceIds:[]})),
    ...Object.entries(OCCASION_DATA).map(([key,data])=>({kind:'occasion',key,title:key,summary:data.note,data,sourceIds:data.sourceIds})),
    ...Object.entries(WEATHER_DATA).map(([key,data])=>({kind:'weather',key,title:key,summary:data.note,data,sourceIds:data.sourceIds})),
    ...STYLES.map(key=>({kind:'style',key,title:key,summary:'Personal style label chosen by the user; not a universal dress rule.',data:{key},sourceIds:[]})),
    {kind:'rubric',key:'weights',title:'Personal outfit compatibility',summary:'Divara’s explainable demo rubric, not a scientific or body rating.',data:{style:40,color:30,occasion:20,weather:10,occasionWithoutWeather:30},sourceIds:[]},
    {kind:'frequency',key:'table',title:'Occasion wear frequency',summary:'How typical each garment is for each occasion (0–96), derived from garment and occasion formality plus the occasion lists. A demo heuristic, not survey data.',data:FREQUENCY,sourceIds:[]},
   ];
   for(const row of rows) await tx.clothingGuide.upsert({where:{id:`${VERSION}:${row.kind}:${row.key}`},create:{id:`${VERSION}:${row.kind}:${row.key}`,version:VERSION,...row,data:row.data as unknown as Prisma.InputJsonValue},update:{}});
  });
 })().catch(err=>{seed=undefined;throw err;});
 return seed;
}
export async function loadKnowledge() {
 await ensureKnowledge();
 const rows=await prisma.clothingGuide.findMany({where:{version:VERSION},orderBy:[{kind:'asc'},{key:'asc'}]});
 const sources=await prisma.guidanceSource.findMany({orderBy:{id:'asc'}});
 return {version:VERSION,garments:rows.filter(r=>r.kind==='garment').map(r=>r.data as unknown as GarmentGuide),
  occasions:rows.filter(r=>r.kind==='occasion').map(r=>({key:r.key,...r.data as typeof OCCASION_DATA[string]})),
  weather:rows.filter(r=>r.kind==='weather').map(r=>({key:r.key,...r.data as typeof WEATHER_DATA[string]})),
  styles:rows.filter(r=>r.kind==='style').map(r=>r.key),
  frequency:(rows.find(r=>r.kind==='frequency')?.data ?? FREQUENCY) as Record<string,Record<string,number>>,
  weights:rows.find(r=>r.kind==='rubric')!.data as {style:number;color:number;occasion:number;weather:number;occasionWithoutWeather:number},sources};
}
export type Knowledge=Awaited<ReturnType<typeof loadKnowledge>>;
export function matchGarment(name:string, guides:GarmentGuide[]) {
 const value=name.toLowerCase().replace(/[^a-z0-9 -]/g,' ');
 return guides.find(g=>g.key===value) ?? guides.flatMap(guide=>guide.aliases.map(alias=>({guide,alias})))
  .sort((a,b)=>b.alias.length-a.alias.length).find(({alias})=>new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`).test(value))?.guide;
}
