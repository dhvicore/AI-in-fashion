import type { Knowledge } from './knowledge.js';
import { accessoryChoices } from './accessories.js';
import { matchGarment } from './knowledge.js';
import { canonicalColor, COLORS, evaluate, fingerprint, canonicalGarments, type ConfirmedGarment, type ScoreContext } from './score.js';
export interface Candidate {item_id:string;product_name:string;subcategory:string;category:string;color:string;style:string;laundry_status?:string;owned?:boolean;recognition?:{confidence?:number}|null;labels_confirmed?:boolean}
export interface OutfitRequirement {garmentKey:string;color?:string|null}

export function isSuitable(item:Candidate,context:ScoreContext,knowledge:Knowledge) {
 const g=matchGarment(item.subcategory,knowledge.garments)??matchGarment(item.product_name,knowledge.garments);
 const rule=knowledge.occasions.find(r=>r.key===context.occasion);
 if(!item.labels_confirmed&&item.recognition?.confidence!==undefined&&item.recognition.confidence<0.55)return false;
 if(item.laundry_status==='in-laundry'||!g||!rule||!COLORS.includes(canonicalColor(item.color))||rule.avoid.includes(g.key))return false;
 if(context.styles.includes('Formal')&&['Tops','Bottoms','Dresses','Shoes'].includes(g.category)&&!g.styles.includes('Formal'))return false;
 if(context.weather==='Cold'&&['Bottoms','Dresses','Shoes'].includes(g.category)&&g.weather.Cold<60)return false;
 if(context.weather==='Rainy'&&g.category==='Shoes'&&g.weather.Rainy<60)return false;
 if(context.weather==='Hot'&&g.weather.Hot<60)return false;
 return true;
}

// Constraints precede ranking. A weighted draw varies suitable looks, never scores.
export function recommend<T extends Candidate>(items:T[],context:ScoreContext,knowledge:Knowledge,seed:number,preferredColors:string[]=[],excludedKeys:string[]=[],strictColors=false,recentOutfits:ConfirmedGarment[][]=[],requirements:OutfitRequirement[]=[]) {
 const colors=[...new Set(preferredColors.map(canonicalColor))];
 const empty=(note:string,exhausted=false)=>({items:[] as T[],note,key:null,exhausted});
 const signature=(g:ConfirmedGarment)=>`${g.garmentKey}:${canonicalColor(g.color)}`;
 const mainKey=(garments:ConfirmedGarment[])=>canonicalGarments(garments).filter(g=>['Tops','Bottoms','Dresses'].includes(knowledge.garments.find(k=>k.key===g.garmentKey)?.category??'')).map(signature).join('|');
 const previousMains=new Set(recentOutfits.map(mainKey));
 const recent=recentOutfits.slice(0,6).map(outfit=>new Set(outfit.map(signature)));
 if(colors.some(c=>!COLORS.includes(c)))return empty('Choose a supported colour from the palette.');
 const rule=knowledge.occasions.find(r=>r.key===context.occasion)!;
 const guides=new Map(items.map(item=>[item.item_id,matchGarment(item.subcategory,knowledge.garments)??matchGarment(item.product_name,knowledge.garments)]));
 const guide=(item:T)=>guides.get(item.item_id);
 const garment=(item:T):ConfirmedGarment=>({garmentKey:guide(item)!.key,color:item.color,style:item.style});
 const affinity=(item:T)=>knowledge.styles.includes(item.style)?context.styles.includes(item.style):guide(item)!.styles.some(s=>context.styles.includes(s));
 const available=items.filter(item=>isSuitable(item,context,knowledge));
 const freq=knowledge.frequency?.[context.occasion]??{};
 const rank=(item:T)=>(colors.includes(canonicalColor(item.color))?60:0)+(affinity(item)?40:0)+(item.owned?12:0)+(rule.recommended.includes(guide(item)!.key)?20:0)+Math.round((freq[guide(item)!.key]??50)/8);
 const pool=(category:string)=>available.filter(i=>guide(i)!.category===category).sort((a,b)=>rank(b)-rank(a)||a.item_id.localeCompare(b.item_id)).slice(0,category==='Shoes'||category==='Outerwear'?10:32);
 const tops=pool('Tops'),bottoms=pool('Bottoms'),dresses=pool('Dresses'),shoes=pool('Shoes');
 const layers=['Cold','Cool','Rainy'].includes(context.weather)?pool('Outerwear').filter(i=>context.weather==='Rainy'?guide(i)!.key==='raincoat':context.weather==='Cold'?guide(i)!.weather.Cold>=80:true):[];
 const bases:T[][]=[...dresses.map(d=>[d]),...tops.flatMap(t=>bottoms.map(b=>[t,b]))];
 if(!bases.length)return empty(`No suitable top and bottom or one-piece outfit is available for ${context.occasion.toLowerCase()}${context.weather==='Any'?'':` in ${context.weather.toLowerCase()} weather`}. Add suitable clothes or include samples.`);
 if(context.weather==='Rainy'&&!layers.length)return empty('Add a rain shell to your wardrobe, or include samples, to build a rainy-weather outfit.');
 const outfits=bases.flatMap(base=>{
  const warmBase=base.some(i=>['sweater','hoodie'].includes(guide(i)!.key));
  if(context.weather==='Cold'&&!warmBase&&!layers.length)return [];
  const layerOptions:(T|undefined)[]=layers.length?layers:[undefined];
  return (shoes.length?shoes:[undefined]).flatMap(shoe=>layerOptions.map(layer=>[...base,...(shoe?[shoe]:[]),...(layer?[layer]:[])]));
 });
 if(!outfits.length)return empty('Add a warm coat, jacket, cardigan or sweater, or include samples, for a cold-weather outfit.');
 const styled=outfits.filter(outfit=>outfit.some(i=>['Tops','Dresses'].includes(guide(i)!.category)&&affinity(i)));
 if(!styled.length)return empty(`Add a top or one-piece outfit matching ${context.styles.join(' / ')}, or include samples, for this request.`);
 const requiredAccessories=requirements.filter(r=>knowledge.garments.find(g=>g.key===r.garmentKey)?.category==='Accessories');
 const accessoryPool=available.filter(i=>guide(i)?.category==='Accessories'&&!requiredAccessories.some(r=>r.garmentKey===guide(i)?.key&&r.color&&canonicalColor(i.color)!==canonicalColor(r.color)));
 const accessoryCache=new Map<string,T[]>();
 const decorated=styled.map(base=>{
  const palette=base.map(i=>canonicalColor(i.color)).sort().join('|');
  let required=accessoryCache.get(palette);
  if(!required){required=accessoryChoices(accessoryPool,base,context,knowledge,requiredAccessories.length?requiredAccessories.map(r=>r.garmentKey):undefined,guides);accessoryCache.set(palette,required);}
  return [...base,...required];
 });
 const constrained=decorated.filter(outfit=>requirements.every(r=>outfit.some(i=>guide(i)?.key===r.garmentKey&&(!r.color||canonicalColor(i.color)===canonicalColor(r.color)))));
 if(!constrained.length)return empty('No available outfit meets all requested clothing types and colours for this occasion and weather. Your wardrobe was kept unchanged.');
 const valid=constrained.filter(outfit=>!strictColors||outfit.some(i=>colors.includes(canonicalColor(i.color))));
 if(!valid.length)return empty(`No suitable outfit includes ${preferredColors.join(' / ')}. Add a matching piece or include samples; your colour choice has been kept.`);
 const ranked=valid.map(outfit=>{
  const garments=outfit.map(garment);
  const result=evaluate(garments,context,knowledge,true);
  const overlap=recent.reduce((sum,previous,index)=>sum+garments.filter(g=>previous.has(signature(g))).length*(6-index),0);
  const coverage=new Set(outfit.map(i=>canonicalColor(i.color)).filter(c=>colors.includes(c))).size;
  return {outfit,result,key:fingerprint(outfit.map(garment),context,result.version),main:mainKey(garments),rank:(result.score??0)+coverage*15+outfit.filter(i=>i.owned).length*3-overlap*2};
 }).filter(r=>r.result.score!==null).sort((a,b)=>b.rank-a.rank||a.key.localeCompare(b.key));
 // Different IDs with identical clothing descriptions are the same look.
 const keys=new Set<string>();
 const unique=ranked.filter(r=>{if(keys.has(r.key))return false;keys.add(r.key);return true;});
 if(!unique.length)return empty('These pieces need a recognised clothing type and colour. Edit them in My Wardrobe, then try again.');
 const unseen=unique.filter(r=>!excludedKeys.includes(r.key)&&!previousMains.has(r.main));
 if(!unseen.length)return empty('No new main-clothing combinations are available for these choices. Explore sample looks for more variety, or add another suitable top, bottom or one-piece outfit.',true);
 const choices=unseen;
 const shortlist=choices.filter(r=>r.rank>=choices[0].rank-12).slice(0,30);
 const weights=shortlist.map(r=>Math.exp((r.rank-shortlist[0].rank)/8));
 let t=seed+0x6d2b79f5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
 let draw=(((t^(t>>>14))>>>0)/4294967296)*weights.reduce((a,b)=>a+b,0);
 const drawn=weights.findIndex(w=>{draw-=w;return draw<0;});
 const index=drawn<0?shortlist.length-1:drawn;
 const chosen=shortlist[index];
 const note=[colors.length?`Includes ${[...new Set(chosen.outfit.map(i=>i.color).filter(c=>colors.includes(canonicalColor(c))))].join(', ') || 'your closest available palette'}.`:'',!shoes.length?'Add suitable footwear to complete this look.':''].filter(Boolean).join(' ');
 return {items:chosen.outfit,note,key:chosen.key,exhausted:false,selection:{method:'weighted-compatible-candidates',probability:weights[index]/weights.reduce((a,b)=>a+b,0),candidateCount:shortlist.length,meaning:'Probability of selecting this outfit within the shortlist; not a probability of fashion correctness.'}};
}
