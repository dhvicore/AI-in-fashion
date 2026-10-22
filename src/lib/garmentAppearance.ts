import type { ClothingItem } from '@/types/fashion';

export type Sleeve='strapless'|'sleeveless'|'short'|'long'|'unknown';
export function garmentSleeve(item:Pick<ClothingItem,'product_name'|'subcategory'|'sleeve'|'recognition'>):Sleeve {
 const description=`${item.product_name} ${item.subcategory}`.toLowerCase();
 // Explicit saved labels win over an older machine prediction.
 if(/strapless|tube top|bandeau/.test(description))return 'strapless';
 if(/sleeveless|sleeve.less|tank|camisole|halter|spaghetti/.test(description))return 'sleeveless';
 if(/\b(?:short[ -]sleeve(?:d)?|t[ -]?shirt|tee|polo)\b/.test(description))return 'short';
 if(/\b(?:long[ -]sleeve(?:d)?|sweater|sweatshirt|hoodie|turtleneck|oxford|poplin|button[ -]down)\b/.test(description))return 'long';
 return item.sleeve??item.recognition?.sleeve??'unknown';
}
