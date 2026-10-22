import { createHash } from 'node:crypto';
import type { Knowledge } from './knowledge.js';
export interface ConfirmedGarment { garmentKey:string; color:string; style:string; originalIndex?:number }
export interface ScoreContext { styles:string[]; occasion:string; weather:string }
const normalize=(s:string)=>s.trim().toLowerCase().replace(/\s+/g,' ');
const ALIASES:Record<string,string>={blush:'pink','denim blue':'blue',sky:'blue',emerald:'green',gray:'grey','light blue':'blue','dark blue':'navy',maroon:'burgundy','off white':'ivory','off-white':'ivory',tan:'camel',khaki:'beige','light brown':'camel','dark brown':'brown'};
const PALETTE:Record<string,{neutral:boolean;hue:number}>=Object.fromEntries([
 ...['black','white','ivory','cream','grey','charcoal','beige','camel','brown','navy','silver','gold'].map(key=>[key,{neutral:true,hue:0}]),
 ...Object.entries({red:0,burgundy:345,pink:330,orange:30,rust:20,yellow:55,mustard:45,green:120,olive:80,sage:110,teal:175,blue:220,purple:280,lavender:270}).map(([key,hue])=>[key,{neutral:false,hue}]),
]);
export const COLORS=Object.keys(PALETTE);
const palette=(color:string)=>Object.hasOwn(PALETTE,color)?PALETTE[color]:undefined;
export const canonicalColor=(color:string)=>{const key=normalize(color);return Object.hasOwn(ALIASES,key)?ALIASES[key]:key;};
export function canonicalGarments(garments:ConfirmedGarment[]) {
 return garments.map(g=>({garmentKey:normalize(g.garmentKey),color:canonicalColor(g.color),style:g.style.trim()})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b),'en'));
}
export function fingerprint(garments:ConfirmedGarment[],context:ScoreContext,version:string) {
 return createHash('sha256').update(JSON.stringify({garments:canonicalGarments(garments),context:{...context,styles:[...new Set(context.styles)].sort()},version})).digest('hex');
}
const avg=(values:number[])=>Math.round(values.reduce((sum,n)=>sum+n,0)/Math.max(1,values.length));
export function colorCompatibility(colors:string[]) {
 if(!colors.length)return null;
 const unique=[...new Set(colors.map(canonicalColor))];
 const pairs:number[]=[];
 for(let i=0;i<unique.length;i++)for(let j=i+1;j<unique.length;j++){
  const a=palette(unique[i]),b=palette(unique[j]);if(!a||!b)continue;
  const distance=Math.min(Math.abs(a.hue-b.hue),360-Math.abs(a.hue-b.hue));
  // A pairing with any neutral is safe (95). Otherwise harmony varies smoothly
  // with the hue gap — matching and complementary hues read well, clashing
  // mid-gaps read worst — so colour scores spread out instead of snapping to buckets.
  pairs.push(a.neutral||b.neutral?95:Math.max(45,Math.round(72+20*Math.cos(2*distance*Math.PI/180))));
 }
 return unique.some(c=>!palette(c))?null:unique.length<=1?95:Math.max(40,avg(pairs)-Math.max(0,unique.length-4)*5);
}
export function evaluate(garments:ConfirmedGarment[],context:ScoreContext,knowledge:Knowledge,automatic=false) {
 const canonical=canonicalGarments(garments);
 const details=canonical.map(g=>({g,guide:knowledge.garments.find(x=>x.key===g.garmentKey)}));
 const missing:string[]=[];
 if(!context.styles.length) missing.push('Choose a preferred style in your profile or for this outing.');
 if(details.some(d=>!d.guide)) missing.push('Confirm the clothing types.');
 if(details.some(d=>!palette(d.g.color))) missing.push('Confirm a supported main colour for each piece.');
 if(!automatic&&details.some(d=>!knowledge.styles.includes(d.g.style))) missing.push('Confirm the style of each piece.');
 const categories=details.map(d=>d.guide?.category);
 if(!automatic&&!categories.includes('Dresses')&&!(categories.includes('Tops')&&categories.includes('Bottoms'))) missing.push('Include a dress, or both a top and bottom, to score a full outfit.');
 if(automatic&&!details.some(d=>d.guide&&d.guide.category!=='Accessories'))missing.push('No main clothing was detected. Try a clearer clothing photo.');
 const matchesStyle=(d:typeof details[number])=>knowledge.styles.includes(d.g.style)?context.styles.includes(d.g.style):Boolean(automatic&&d.guide?.styles.some(s=>context.styles.includes(s)));
 const core=details.filter(d=>d.guide?.category!=='Accessories');
 const style=missing.some(m=>/style/.test(m))?null:avg(core.map(d=>matchesStyle(d)?100:40));
 const color=colorCompatibility(canonical.map(g=>g.color));
 const rule=knowledge.occasions.find(o=>o.key===context.occasion)!;
 // How typical each piece is for this occasion, from the learned frequency table
 // (falls back to the recommended/avoid lists if the table is missing a key).
 const freq=knowledge.frequency?.[context.occasion]??{};
 const occasion=details.some(d=>!d.guide)?null:avg(core.map(d=>freq[d.g.garmentKey]??(rule.avoid.includes(d.g.garmentKey)?30:rule.recommended.includes(d.g.garmentKey)?95:70)));
 let weather:number|null=null;
 if(context.weather!=='Any'&&!details.some(d=>!d.guide)){
  weather=avg(core.map(d=>d.guide!.weather[context.weather]??70));
  if(context.weather==='Cold'){
   const warm=core.filter(d=>(d.guide?.category==='Outerwear'||['sweater','hoodie'].includes(d.g.garmentKey))&&(d.guide?.weather.Cold??0)>=80);
   weather=warm.length?Math.max(weather,Math.round(50+Math.max(...warm.map(d=>d.guide!.weather.Cold))*.4)):Math.min(weather,45);
  }
  if(context.weather==='Rainy'&&!core.some(d=>d.g.garmentKey==='raincoat')) weather=Math.min(weather,55);
 }
 const weights={style:knowledge.weights.style,color:knowledge.weights.color,occasion:context.weather==='Any'?knowledge.weights.occasionWithoutWeather:knowledge.weights.occasion,weather:context.weather==='Any'?0:knowledge.weights.weather};
 const score=missing.length?null:Math.round((style!*weights.style+color!*weights.color+occasion!*weights.occasion+(weather??0)*weights.weather)/100);
 const reasons=[`Preferred style: ${context.styles.join(', ')||'not selected'}. ${automatic?'Automatic style matching uses the detected clothing types and their stored style affinities.':'Each confirmed main piece scores 100 for a chosen style or 40 for another style.'}`,
  'Colour rules: any pair with a neutral scores 95; other pairs scale smoothly with the hue gap (matching and complementary hues highest, clashing mid-gaps lowest), averaged across unique pairs.',
  `${context.occasion}: each piece scores by how typically it is worn for this occasion (0–96), from the garment/occasion formality gap and this occasion's recommended and avoided lists. ${rule.note}`];
 if(context.weather!=='Any')reasons.push(`${context.weather}: average of stored garment weather rules, with checks for cold layers and rain shells. Fabric protection is not verified.`);
 const corrections:string[]=[];
 if(style!==null&&style<90)corrections.push(`For your ${context.styles.join(' / ')} goal, consider replacing ${core.filter(d=>!matchesStyle(d)).map(d=>`${d.g.color} ${d.guide?.title}`).join(', ')} with a piece in your chosen style.`);
 if(color!==null&&color<85)corrections.push('Try a neutral colour or a closer colour pair; compare it against your own preferred palette.');
 if(occasion!==null&&occasion<85)corrections.push(`For ${context.occasion.toLowerCase()}, consider ${rule.recommended.slice(0,5).map(key=>knowledge.garments.find(g=>g.key===key)?.title).join(', ')}. Check the venue dress code first.`);
 if(context.weather==='Cold'&&(weather??100)<75)corrections.push('Consider adding a warm layer; check the fabric and your comfort rather than relying on the garment name.');
 if(context.weather==='Hot'&&(weather??100)<75)corrections.push('Consider a lighter outfit or a removable outer layer for hot conditions.');
 if(context.weather==='Rainy'&&(weather??100)<75)corrections.push('Consider a rain shell and confirm its water protection.');
 if(!corrections.length&&score!==null)corrections.push('This outfit matches the selected demo rules. No change is required; choose what feels comfortable to you.');
 const weatherRule=knowledge.weather.find(w=>w.key===context.weather);
 const sourceIds=[...new Set([...rule.sourceIds,...(weatherRule?.sourceIds??[])])];
 return {score,breakdown:{style,color,occasion,weather},weights,context,version:knowledge.version+(automatic?'-auto-v4':''),garments:canonical,reasons,corrections,
  limitations:missing.length?missing.join(' '):automatic?'Automatic compatibility estimate based on visible clothing, colours and your selected style. Hidden clothing, fabric and fit are not verified.':'Compatibility with selected preferences and curated demo guidance; not an objective fashion or body rating. Weather checks use garment types, not verified fabric performance.',
  sources:knowledge.sources.filter(s=>sourceIds.includes(s.id))};
}
export type AssessmentResult=ReturnType<typeof evaluate>;
