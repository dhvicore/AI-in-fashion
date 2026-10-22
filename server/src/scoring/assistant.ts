import { matchGarment, type Knowledge } from './knowledge.js';
import { isSuitable, recommend, type Candidate, type OutfitRequirement } from './recommend.js';
import { canonicalColor, COLORS, evaluate, type ScoreContext, type ConfirmedGarment } from './score.js';
import { accessoryChoices, JEWELLERY } from './accessories.js';

export interface ConversationState {
 itemIds:string[];
 context:ScoreContext;
 targetId?:string;
}
export interface RecommendationHistoryEntry {context:ScoreContext;garments:ConfirmedGarment[]}

// Conversation state contains IDs only. The route resolves every piece against
// this account's current wardrobe before applying an edit.
export function respond<T extends Candidate>(message:string,items:T[],knowledge:Knowledge,preferences:{styles?:string[];colors?:string[]},previous?:ConversationState,requirements:OutfitRequirement[]=[],history:RecommendationHistoryEntry[]=[]) {
 const text=message.toLowerCase();
 const word=(value:string)=>new RegExp(`\\b${value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(text);
 const occasionTerms:[string,string][]=[['wedding','Wedding'],['interview','Interview'],['office|work','Office'],['formal','Formal'],['date|dinner','Date'],['party','Party'],['travel','Travel'],['college','College'],['workout|gym','Workout'],['hike|outdoor','Outdoor'],['casual','Casual']];
 const occasion=occasionTerms.find(([pattern])=>new RegExp(`\\b(?:${pattern})\\b`).test(text))?.[1];
 const weatherTerms:[string,string][]=[['rain|rainy','Rainy'],['cold','Cold'],['hot|heat','Hot'],['cool','Cool'],['warm','Warm'],['any weather','Any']];
 const weather=weatherTerms.find(([pattern])=>new RegExp(`\\b(?:${pattern})\\b`).test(text))?.[1];
 const style=knowledge.styles.find(s=>word(s));
 const styles=preferences.styles?.filter(s=>knowledge.styles.includes(s))??[];
 const defaults:Record<string,string>={Wedding:'Formal',Formal:'Formal',Interview:'Formal',Office:'Minimal',Party:'Chic',Date:'Chic',Workout:'Sporty'};
 const context:ScoreContext={occasion:occasion??previous?.context.occasion??'Casual',weather:weather??previous?.context.weather??'Any',styles:style?[style]:!occasion&&previous?previous.context.styles:styles.length?styles:[defaults[occasion??'Casual']??'Casual']};
 const current=(previous?.itemIds??[]).map(id=>items.find(i=>i.item_id===id)).filter((i):i is T=>Boolean(i));
 const state:ConversationState={itemIds:current.map(i=>i.item_id),context,targetId:previous?.targetId};
 const guide=(item:T)=>matchGarment(item.subcategory,knowledge.garments)??matchGarment(item.product_name,knowledge.garments);
 const result=(note:string,outfit:T[]=current)=>({note,items:outfit,state:{...state,itemIds:outfit.map(i=>i.item_id)},score:outfit.length?evaluate(outfit.map(i=>({garmentKey:guide(i)?.key??'unknown',color:i.color,style:i.style})),context,knowledge,true).score:null});
 const aliases=['off white','off-white','light blue','dark blue','light brown','dark brown','denim blue','blush','emerald','gray','maroon','tan','khaki'];
 let remaining=text;
 const requestedColors:string[]=[];
 for(const color of [...aliases,...COLORS].sort((a,b)=>b.length-a.length)) {
  const pattern=new RegExp(`\\b${color}\\b`,'g');
  if(pattern.test(remaining)){requestedColors.push(canonicalColor(color));remaining=remaining.replace(pattern,' ');}
 }
 const colors=[...new Set(requestedColors)];
 const accessoryRequest=/\b(accessor(?:y|ies)|jewellery|jewelry|earrings?|necklace|bracelets?|bangles?|rings?|handbag|bag|belt|watch|sunglasses)\b/.test(text);
 if(accessoryRequest&&!/\b(change|replace|swap|switch|remove|without|no)\b/.test(text)) {
  const mentioned=matchGarment(text,knowledge.garments);
  const keys=mentioned?.category==='Accessories'&&mentioned.key!=='accessory'?[mentioned.key]:/\b(jewellery|jewelry)\b/.test(text)?JEWELLERY:undefined;
  const choices=accessoryChoices(items.filter(i=>isSuitable(i,context,knowledge)&&(!colors.length||colors.includes(canonicalColor(i.color)))),current,context,knowledge,keys);
  if(!choices.length)return result('No matching accessories are available in your wardrobe for this request. Add or review a suitable piece first.');
  state.targetId=choices.length===1?choices[0].item_id:undefined;
  return result(`Try ${choices.map(i=>i.product_name).join(' and ')} from your wardrobe.${current.length?' I kept the clothes in your current outfit.':''}`,[...current,...choices].slice(0,12));
 }
 if(/\b(remove|without|no)\b/.test(text)&&current.length) {
  const mentioned=matchGarment(text,knowledge.garments);
  if(accessoryRequest) {
   const keep=current.filter(i=>mentioned&&mentioned.key!=='accessory'?guide(i)?.key!==mentioned.key:/\b(jewellery|jewelry)\b/.test(text)?!JEWELLERY.includes(guide(i)?.key??''):guide(i)?.category!=='Accessories');
   state.targetId=undefined;
   return result('Kept your clothing and removed the requested accessories.',keep);
  }
  return result('Which accessory should I remove? For a clothing change, name the piece and its replacement.');
 }
 const wantsEdit=/\b(change|replace|swap|switch|instead|make)\b/.test(text)||Boolean(current.length&&colors.length&&!occasion&&!/\b(outfit|look)\b/.test(text));
 if(wantsEdit) {
  if(!previous?.itemIds.length)return result('Ask me for an outfit first, then tell me which piece to change.',[]);
  if(current.length!==previous.itemIds.length)return result('A piece from this outfit is no longer available. Ask for a new outfit from your current wardrobe.',[]);
  // Resolve clothing nouns before pronouns; a shirt request cannot select a dress.
  const mentioned=matchGarment(text,knowledge.garments);
  const category=/\b(tops?|bottoms?|shoes?|footwear|outerwear|accessor(?:y|ies))\b/.exec(text)?.[0];
  const categoryMap:Record<string,string>={top:'Tops',tops:'Tops',bottom:'Bottoms',bottoms:'Bottoms',shoe:'Shoes',shoes:'Shoes',footwear:'Shoes',outerwear:'Outerwear',accessory:'Accessories',accessories:'Accessories'};
  const specific=mentioned&&!(['top','shoes','accessory'].includes(mentioned.key)&&category)?mentioned:undefined;
  const multiple=text.split(/\band\b|&|,/).map(part=>matchGarment(part,knowledge.garments)?.key).filter(Boolean);
  if(new Set(multiple).size>1)return result('Please change one piece at a time. Which piece should I replace first?');
  if(!colors.length&&!style&&/\b(?:to|in)\s+\w+/.test(text)&&!matchGarment(text.split(/\b(?:to|in)\b/).at(-1)??'',knowledge.garments))return result('Which colour should I use? Please name a supported colour, such as red, navy, black, or ivory.');
  const targets=specific?current.filter(i=>guide(i)?.key===specific.key):category?current.filter(i=>guide(i)?.category===categoryMap[category]):mentioned?current.filter(i=>guide(i)?.key===mentioned.key):current.filter(i=>i.item_id===previous.targetId);
  if(targets.length!==1)return result(mentioned||category?'Which piece should I change? That clothing type is missing or ambiguous in this outfit.':'Which piece should I change: the top, bottom, shoes, or another item?');
  const target=targets[0];
  state.targetId=target.item_id;
  if(colors.length>1)return result('Please choose one colour for the replacement.');
  if(colors.length&&canonicalColor(target.color)===colors[0])return result(`Your ${target.product_name} is already ${colors[0]}. I kept the outfit.`);
  const candidates=items.filter(i=>i.item_id!==target.item_id&&!current.some(c=>c.item_id===i.item_id)&&guide(i)?.category===guide(target)?.category&&(!specific||guide(i)?.key===specific.key)&&(mentioned||category||guide(i)?.key===guide(target)?.key)&&(!colors.length||canonicalColor(i.color)===colors[0])&&isSuitable(i,context,knowledge));
  const ranked=candidates.map(item=>({item,score:evaluate(current.map(i=>i.item_id===target.item_id?item:i).map(i=>({garmentKey:guide(i)!.key,color:i.color,style:i.style})),context,knowledge,true).score??-1})).sort((a,b)=>b.score-a.score||Number(Boolean(b.item.owned))-Number(Boolean(a.item.owned))||a.item.item_id.localeCompare(b.item.item_id));
  const replacement=ranked[0]?.item;
  if(!replacement)return result(`No suitable ${colors.length?colors[0]+' ':''}${mentioned?.title.toLowerCase()??guide(target)?.category.toLowerCase()} replacement is available in your wardrobe for ${context.occasion.toLowerCase()}. I kept your outfit.`);
  state.targetId=replacement.item_id;
  return result(`Replaced ${target.product_name} with ${replacement.product_name} for ${context.occasion.toLowerCase()}. Kept the other pieces.`,current.map(i=>i.item_id===target.item_id?replacement:i));
 }
 if(/\b(colou?r|match|suit)\b/.test(text)&&!occasion&&!/\b(wear|suggest|recommend|show|give|new|another)\b/.test(text)) {
  return result(current.length?`This outfit pairs ${[...new Set(current.map(i=>i.color))].join(', ')}. To try another colour, say “change the shirt to red” or name another piece.`:'Ask for an outfit first, or name the piece and colour you want.');
 }
 if(!occasion&&!weather&&!style&&!/\b(wear|outfit|look|suggest|recommend|wardrobe|closet|clothes|trendy|today|another|something|fix)\b/.test(text))return result('I can suggest wardrobe outfits or replace a specific piece. Try “what should I wear for a wedding?” or “change the shirt to red”.');
 const recent=/\b(another|different|new)\b/.test(text)&&current.length?[current.map(i=>({garmentKey:guide(i)?.key??'unknown',color:i.color,style:i.style}))]:[];
 recent.push(...history.filter(h=>h.context.occasion===context.occasion&&h.context.weather===context.weather&&JSON.stringify([...h.context.styles].sort())===JSON.stringify([...context.styles].sort())).map(h=>h.garments));
 const pick=recommend(items,context,knowledge,0,colors.length?colors:preferences.colors??[],[],colors.length>0,recent,requirements);
 state.targetId=undefined;
 return result(pick.items.length?`For ${context.occasion.toLowerCase()}, try these pieces from your wardrobe.${pick.note?' '+pick.note:''}`:pick.note.replace(/Add suitable clothes or include samples\./,'Add suitable clothes to your wardrobe.').replace(/, or include samples/g,'').replace(/ or include samples/g,''),pick.items);
}
