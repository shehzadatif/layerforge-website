import type { Product } from "../../types/product";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="border rounded-lg p-4">
      <h3>{product.name}</h3>
      <p>CAD ${product.price.toFixed(2)}</p>
    </div>
  );
}