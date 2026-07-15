import { useState } from "react";

interface Props {
  images: string[];
  productName: string;
}

export default function ProductGallery({
  images,
  productName,
}: Props) {
  const [selected, setSelected] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl bg-white shadow">
        No Image
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl bg-white shadow">
        <img
          src={images[selected]}
          alt={productName}
          className="aspect-square w-full object-contain transition-all duration-300"
        />
      </div>

      {images.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelected(index)}
              className={`overflow-hidden rounded-xl border-2 transition ${
                selected === index
                  ? "border-yellow-400"
                  : "border-transparent hover:border-slate-300"
              }`}
            >
              <img
                src={image}
                alt={`${productName} ${index + 1}`}
                className="h-20 w-20 object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}