import { matchGarment, type Knowledge, type GarmentGuide } from './knowledge.js';
import { canonicalColor, colorCompatibility, type ScoreContext } from './score.js';
import type { Candidate } from './recommend.js';

export const JEWELLERY=['earrings','necklace','bracelet','ring'];
export function accessoryChoices<T extends Candidate>(items:T[],outfit:T[],context:ScoreContext,knowledge:Knowledge,keys?:string[],guides?:Map<string,GarmentGuide|undefined>) {
 const cache=guides??new Map([...items,...outfit].map(item=>[item.item_id,matchGarment(item.subcategory,knowledge.garments)??matchGarment(item.product_name,knowledge.garments)]));
 const guide=(item:T)=>cache.get(item.item_id);
 const types=new Set(outfit.filter(i=>guide(i)?.category==='Accessories').map(i=>guide(i)!.key));
 const eligible=items.filter(i=>guide(i)?.category==='Accessories'&&i.laundry_status!=='in-laundry'&&!outfit.some(o=>o.item_id===i.item_id)&&!types.has(guide(i)!.key)&&(!keys||keys.includes(guide(i)!.key)||keys===JEWELLERY&&/jewel/i.test(i.subcategory)))
  .filter(i=>context.occasion!=='Workout'||guide(i)?.key==='watch')
  .filter(i=>!['Wedding','Formal','Interview'].includes(context.occasion)||!['hat','sunglasses'].includes(guide(i)!.key))
  .filter(i=>!['Hot','Warm'].includes(context.weather)||guide(i)!.key!=='scarf');
 const rank=(item:T)=>(colorCompatibility([...outfit.map(i=>i.color),canonicalColor(item.color)])??0)+(item.owned?18:0)+(context.styles.some(s=>guide(item)!.styles.includes(s))?10:0);
 const sorted=eligible.sort((a,b)=>rank(b)-rank(a)||a.item_id.localeCompare(b.item_id));
 const picked:T[]=[];
 for(const item of sorted) {
  const key=guide(item)!.key;
  if(types.has(key))continue;
  if(!keys&&JEWELLERY.includes(key)&&picked.some(i=>JEWELLERY.includes(guide(i)!.key)))continue;
  types.add(key);picked.push(item);
  if(picked.length===(keys?Math.min(3,keys.length):2))break;
 }
 return picked;
}
