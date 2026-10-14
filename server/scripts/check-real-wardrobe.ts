// Run from project root: server/node_modules/.bin/tsx --tsconfig tsconfig.app.json server/scripts/check-real-wardrobe.ts
import assert from 'node:assert/strict';
import { generateOutfit, scoreOutfit, assistantRespond, derivePersonality } from '../../src/engine/ai';
import type { ClothingItem } from '../../src/types/fashion';
const base = { color:'White',colorHex:'#FFFFFF',pattern:'Solid',style:'Casual',season:['Summer'],occasion:['Casual'],gender:'Unisex',material:'Cotton',fit:'Regular',formality_score:40,trend_score:50,comfort_score:50,versatility_score:50,sustainability_score:50,wear_count:0,last_worn_days_ago:null,owned:true };
const real: ClothingItem[] = [{...base,item_id:'my-shirt',product_name:'My shirt',category:'Tops',subcategory:'T-shirt'}, {...base,item_id:'my-jeans',product_name:'My jeans',category:'Bottoms',subcategory:'Jeans'}, {...base,item_id:'my-shoes',product_name:'My shoes',category:'Shoes',subcategory:'Sneakers'}];
assert.deepEqual(generateOutfit([], {seed:42}), []);
assert.equal(scoreOutfit([]).total, 0);
assert.equal(assistantRespond('What should I wear?', [], derivePersonality([])).outfitItems, undefined);
const allowed=new Set(real.map(item=>item.item_id));
for(let seed=0;seed<20;seed++){const outfit=generateOutfit(real,{seed});assert.equal(outfit.length,3);assert(outfit.every(item=>allowed.has(item.item_id)));}
console.log('PASS: empty closets produce no fake outfits/scores; outfit generation uses only the supplied real pieces across 20 seeds.');

const laundry = real.map(item=>({...item,laundry_status:'in-laundry' as const}));
assert.deepEqual(generateOutfit(laundry,{seed:42}),[]);
assert.equal(assistantRespond('What should I wear?',laundry,derivePersonality(laundry)).outfitItems,undefined);
const mixed = [...laundry,{...real[0],item_id:'clean-shirt',laundry_status:'clean' as const}];
for(let seed=0;seed<20;seed++)assert.deepEqual(generateOutfit(mixed,{seed}).map(item=>item.item_id),['clean-shirt']);
const washed = laundry.map(item=>({...item,laundry_status:'clean' as const}));
assert.equal(generateOutfit(washed,{seed:42}).length,3);
console.log('PASS: laundry pieces excluded across 20 seeds; all-laundry closets produce no outfit; washed pieces become available again.');
