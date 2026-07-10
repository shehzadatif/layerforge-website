export interface Product {
  id: string;

  name: string;

  slug: string;

  sku: string;

  short_description: string;

  description: string;

  price: number;

  sale_price?: number;

  stock: number;

  featured: boolean;

  status: string;

  category: {
    id: string;
    name: string;
    slug: string;
  };

  images: ProductImage[];

  variants: ProductVariant[];
}

export interface ProductImage {
  id: string;
  image_url: string;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  option_name: string;
  option_value: string;
}