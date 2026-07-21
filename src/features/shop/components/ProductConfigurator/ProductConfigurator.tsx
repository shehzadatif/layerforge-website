import { useMemo, useState } from "react";
import { toast } from "sonner";
import { addToCart } from "../../../cart/cartStorage";
import {
  formatProductionDuration,
  normalizeProductionDays,
} from "../../../../lib/productionEstimate";

type Material = {
  id: string;
  name: string;
  markup_percent: number;
  default_production_days?: number | string | null;
};

type ProductMaterial = {
  material_id: string;
  materials: Material;
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  sale_price?: number | null;
  product_materials: ProductMaterial[];
};

interface Props {
  product: Product;
  image: string;
}

export default function ProductConfigurator({ product, image }: Props) {
  const [selectedMaterial, setSelectedMaterial] = useState(
    product.product_materials?.[0],
  );

  const [quantity, setQuantity] = useState(1);

  const productionDays = normalizeProductionDays(
    selectedMaterial?.materials.default_production_days,
  );

  const unitPrice = useMemo(() => {
    const salePrice = Number(product.sale_price);
    const basePrice =
      Number.isFinite(salePrice) && salePrice > 0
        ? salePrice
        : Number(product.price);

    if (!selectedMaterial) return basePrice;

    const markup = selectedMaterial.materials.markup_percent;

    return basePrice * (1 + markup / 100);
  }, [selectedMaterial, product.price, product.sale_price]);

  function handleAddToCart() {
    if (!selectedMaterial) return;

    addToCart({
      id: product.id,
      name: product.name,
      materialId: selectedMaterial.material_id,
      materialName: selectedMaterial.materials.name,
      quantity,
      price: Number(unitPrice),
      image,
      productionDays,
    });

    toast.success("Added to Cart", {
      description: `${product.name} • ${selectedMaterial.materials.name} • Qty ${quantity}`,
    });

    console.log(
      `${product.name} • ${selectedMaterial.materials.name} • Qty ${quantity}`,
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-4 text-xl font-semibold">Material</h2>

        <div className="space-y-3">
          {product.product_materials.map((pm) => {
            const markup = pm.materials.markup_percent;

            return (
              <label
                key={pm.material_id}
                className="flex cursor-pointer items-center justify-between rounded-xl border p-4 hover:border-yellow-400"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    checked={selectedMaterial?.material_id === pm.material_id}
                    onChange={() => setSelectedMaterial(pm)}
                  />

                  <span className="font-medium">{pm.materials.name}</span>
                </div>

                <span className="text-slate-500">
                  {markup === 0 ? "Included" : `+${markup}%`}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-5">
        <div className="text-sm font-semibold text-slate-950">
          Estimated production
        </div>
        <div className="mt-1 text-slate-700">
          {productionDays > 0
            ? `${formatProductionDuration(productionDays)} after payment`
            : "Confirmed after we review your order"}
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          Production time may vary based on order quantity and material
          availability.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-xl font-semibold">Quantity</h2>

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="rounded-lg border px-4 py-2"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
          >
            −
          </button>

          <span className="text-xl font-bold">{quantity}</span>

          <button
            type="button"
            className="rounded-lg border px-4 py-2"
            onClick={() => setQuantity(quantity + 1)}
          >
            +
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-slate-100 p-6">
        <div className="text-sm text-slate-500">Total</div>

        <div className="text-4xl font-bold">
          CAD ${(unitPrice * quantity).toFixed(2)}
        </div>
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        className="w-full rounded-xl bg-yellow-400 py-4 text-lg font-semibold hover:bg-yellow-300"
      >
        Add To Cart
      </button>
    </div>
  );
}
