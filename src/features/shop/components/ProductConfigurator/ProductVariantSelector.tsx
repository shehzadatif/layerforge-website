import { useEffect, useMemo, useState } from "react";

type ProductVariant = {
  id: string;
  option_value: string;
  price: number | string;
  active?: boolean | null;
  sort_order?: number | string | null;
  image_url?: string | null;
};

type Product = {
  price: number;
  sale_price?: number | null;
  product_variants?: ProductVariant[] | null;
};

interface Props {
  product: Product;
}

export default function ProductVariantSelector({ product }: Props) {
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

  const baseModelPrice =
    Number(product.sale_price) > 0
      ? Number(product.sale_price)
      : Number(product.price);
  const selectedModelPrice = selectedVariant
    ? Number(selectedVariant.price)
    : baseModelPrice;

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("product-variant-selected", {
        detail: {
          variantId: selectedVariantId,
        },
      }),
    );

    window.dispatchEvent(
      new CustomEvent("product-variant-image-selected", {
        detail: {
          imageUrl: selectedVariant?.image_url ?? null,
        },
      }),
    );
  }, [selectedVariantId, selectedVariant?.image_url]);

  if (variants.length === 0) {
    return null;
  }

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="product-variant-heading"
    >
      <h2
        id="product-variant-heading"
        className="mb-4 text-xl font-semibold text-slate-950"
      >
        Choose a Variant
      </h2>

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
            CAD ${baseModelPrice.toFixed(2)}
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

      <div
        className="mt-5 rounded-xl border border-yellow-300 bg-yellow-50 p-4"
        aria-live="polite"
      >
        <div className="text-sm font-semibold text-slate-700">
          Selected model price
        </div>
        <div className="mt-1 text-2xl font-bold text-slate-950">
          CAD ${selectedModelPrice.toFixed(2)}
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Material adjustments and quantity are reflected in the final total.
        </p>
      </div>
    </section>
  );
}
