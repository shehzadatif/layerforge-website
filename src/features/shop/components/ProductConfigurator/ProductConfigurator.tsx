import { useEffect, useMemo, useState } from "react";
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

type ProductVariant = {
  id: string;
  option_value: string;
  price: number | string;
  sku?: string | null;
  active?: boolean | null;
  sort_order?: number | string | null;
  image_url?: string | null;
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  sale_price?: number | null;
  product_materials: ProductMaterial[];
  product_variants?: ProductVariant[] | null;
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

  const variants = useMemo(
    () =>
      [...(product.product_variants ?? [])]
        .filter(
          (variant) =>
            variant.active !== false &&
            Number.isFinite(Number(variant.price)) &&
            Number(variant.price) > 0,
        )
        .sort(
          (left, right) =>
            Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0),
        ),
    [product.product_variants],
  );
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const selectedVariant = variants.find(
    (variant) => variant.id === selectedVariantId,
  );

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("product-variant-image-selected", {
        detail: {
          imageUrl: selectedVariant?.image_url ?? null,
        },
      }),
    );
  }, [selectedVariant?.image_url]);

  const productionDays = normalizeProductionDays(
    selectedMaterial?.materials.default_production_days,
  );

  const unitPrice = useMemo(() => {
    const salePrice = Number(product.sale_price);
    const productBasePrice =
      Number.isFinite(salePrice) && salePrice > 0
        ? salePrice
        : Number(product.price);
    const variantPrice = Number(selectedVariant?.price);
    const basePrice =
      selectedVariant && Number.isFinite(variantPrice) && variantPrice > 0
        ? variantPrice
        : productBasePrice;

    if (!selectedMaterial) return basePrice;

    const markup = selectedMaterial.materials.markup_percent;

    return basePrice * (1 + markup / 100);
  }, [selectedMaterial, selectedVariant, product.price, product.sale_price]);

  function handleAddToCart() {
    if (!selectedMaterial) return;

    addToCart({
      id: product.id,
      name: product.name,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.option_value,
      materialId: selectedMaterial.material_id,
      materialName: selectedMaterial.materials.name,
      quantity,
      price: Number(unitPrice),
      image: selectedVariant?.image_url || image,
      productionDays,
    });

    toast.success("Added to Cart", {
      description: [
        product.name,
        selectedVariant?.option_value,
        selectedMaterial.materials.name,
        `Qty ${quantity}`,
      ]
        .filter(Boolean)
        .join(" • "),
    });

    console.log(
      [
        product.name,
        selectedVariant?.option_value,
        selectedMaterial.materials.name,
        `Qty ${quantity}`,
      ]
        .filter(Boolean)
        .join(" • "),
    );
  }

  return (
    <div className="space-y-8">
      {variants.length > 0 ? (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Variant</h2>

          <div className="space-y-3">
            <label
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition hover:border-yellow-400 ${
                !selectedVariantId
                  ? "border-yellow-400 bg-yellow-50"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="product-variant"
                  checked={!selectedVariantId}
                  onChange={() => setSelectedVariantId("")}
                />

                <span className="font-medium">Base model</span>
              </div>

              <span className="whitespace-nowrap text-slate-600">
                CAD $
                {Number(product.sale_price) > 0
                  ? Number(product.sale_price).toFixed(2)
                  : Number(product.price).toFixed(2)}
              </span>
            </label>

            {variants.map((variant) => (
              <label
                key={variant.id}
                className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition hover:border-yellow-400 ${
                  selectedVariantId === variant.id
                    ? "border-yellow-400 bg-yellow-50"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="product-variant"
                    checked={selectedVariantId === variant.id}
                    onChange={() => setSelectedVariantId(variant.id)}
                  />

                  <span className="font-medium">{variant.option_value}</span>
                </div>

                <span className="whitespace-nowrap text-slate-600">
                  CAD ${Number(variant.price).toFixed(2)}
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

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
