export interface ConfirmedGarment { garmentKey:string; color:string; style:string; originalIndex?:number }
export interface ScoringContext { occasion:string; weather:string; style?:string }
export interface ClothingKnowledge {
 version:string; colors:string[]; styles:string[];
 garments:{key:string;title:string;category:string;aliases:string[];styles:string[]}[];
 occasions:{key:string;note:string;recommended:string[];avoid:string[]}[];
 weather:{key:string;note:string}[];
 sources:{id:string;title:string;url:string;summary:string}[];
}
export interface Assessment {
 id:string; createdAt:string; analysisId:string|null; version:string; score:number|null;
 garments:ConfirmedGarment[]; context:{styles:string[];occasion:string;weather:string};
 breakdown:{style:number|null;color:number|null;occasion:number|null;weather:number|null};
 weights:{style:number;color:number;occasion:number;weather:number};
 reasons:string[]; corrections:string[];limitations:string;
 suggestions?:{itemId:string;name:string;replaces:string;improvement:number}[];
 sources:{id:string;title:string;url:string;summary:string}[];
}
