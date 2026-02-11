export enum EdibilityCategory {  
  EDIBLE = 'EDIBLE',  
  CONDITIONALLY_EDIBLE = 'CONDITIONALLY_EDIBLE',  
  POISONOUS = 'POISONOUS'  
}  
  
export interface MushroomType {  
  id: number;  
  name: string;  
  latinName?: string;  
  category: EdibilityCategory;  
  iconUrl?: string;  
}