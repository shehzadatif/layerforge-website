export type ProductType = "standard" | "custom";

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  price: number;
  images: string[];

  type: ProductType;
}