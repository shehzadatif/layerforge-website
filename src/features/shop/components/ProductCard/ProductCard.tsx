import Card from "../../../../components/ui/Card/Card";
import Button from "../../../../components/ui/Button/Button";
import type { Product } from "../../types/product";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const handleClick = () => {
    window.location.href = `/shop/${product.slug}`;
  };

  return (
    <Card
      hover
      clickable
      className="flex h-full cursor-pointer flex-col overflow-hidden"
      onClick={handleClick}
    >
      <img
        src={product.images?.[0] || "/images/products/placeholder.webp"}
        alt={product.name}
        className="h-56 w-full object-cover"
        onError={(e) => {
          e.currentTarget.src = "/images/products/placeholder.webp";
        }}
      />

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-slate-900">
            {product.name}
          </h3>

          <p className="text-sm text-slate-500">
            {product.category}
          </p>
        </div>

        <p className="mb-6 flex-1 text-slate-600">
          {product.description}
        </p>

        <div className="mb-6 flex items-center justify-between">
          <span className="text-2xl font-bold text-slate-900">
            CAD ${product.price.toFixed(2)}
          </span>
        </div>

        {product.type === "standard" ? (
  <Button fullWidth>
    Add to Cart
  </Button>
) : (
  <Button fullWidth variant="secondary">
    Customize & Quote
  </Button>
)}
      </div>
    </Card>
  );
}