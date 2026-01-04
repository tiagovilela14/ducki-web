export const CATEGORY_OPTIONS = [
  'Tops',
  'T-Shirts',
  'Hoodies',
  'Jackets',
  'Pants',
  'Jeans',
  'Shorts',
  'Skirts',
  'Dresses',
  'Shoes',
  'Sneakers',
  'Bags',
  'Accessories',
  'Sportswear',
  'Underwear',
  'Swimwear',
  'Other',
] as const;

export type CategoryOption = (typeof CATEGORY_OPTIONS)[number];
