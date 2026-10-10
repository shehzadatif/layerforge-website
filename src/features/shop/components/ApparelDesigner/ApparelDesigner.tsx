import {
  useMemo,
  useRef,
  useState,
  useEffect,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { toast } from "sonner";
import { addToCart } from "../../../cart/cartStorage";
import {
  APPAREL_COLORS,
  APPAREL_MAX_PRINT_HEIGHT_IN,
  APPAREL_MAX_PRINT_WIDTH_IN,
  APPAREL_PRINT_CLASS_DETAILS,
  APPAREL_SIZES,
  getApparelPrintClass,
  getApparelPrintSurchargeCents,
  getApparelUnitPriceCents,
  type ApparelArtworkPlacement,
  type ApparelDesignData,
  type ApparelPrintClass,
  type ApparelPrintPricingConfig,
  type ApparelSide,
} from "../../../../lib/apparelDesigner";
import {
  formatProductionDuration,
  normalizeProductionDays,
} from "../../../../lib/productionEstimate";
import type { BulkDiscountConfig } from "../../../../lib/bulkDiscount";
import {
  getGarmentMockupImage,
  getGarmentPrintArea,
} from "../../../../lib/apparelMockup";

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
  active?: boolean | null;
  sort_order?: number | string | null;
  apparel_garment_type?: "t-shirt" | "hoodie" | null;
  apparel_quality?: string | null;
  apparel_color_name?: string | null;
  apparel_color_hex?: string | null;
  apparel_size?: string | null;
  inventory_quantity?: number | string | null;
};

type Product = {
  id: string;
  name: string;
  price: number | string;
  sale_price?: number | string | null;
  apparel_back_print_price?: number | string | null;
  bulk_discount_eligible?: boolean | null;
  allow_bulk_discount_on_sale?: boolean | null;
  product_materials: ProductMaterial[];
  product_variants?: ProductVariant[] | null;
};

type LocalArtwork = {
  file: File;
  previewUrl: string;
  pixelWidth: number;
  pixelHeight: number;
  aspectRatio: number;
  widthIn: number;
  heightIn: number;
  xPercent: number;
  yPercent: number;
};

type UploadedArtwork = {
  path: string;
  originalName: string;
  mimeType: string;
};

interface Props {
  product: Product;
  bulkDiscountConfig: BulkDiscountConfig;
  printPricing: ApparelPrintPricingConfig;
  blankShirtImages: string[];
}

type ApparelPlacementPreset = {
  id: ApparelPrintClass;
  label: string;
  description: string;
  widthIn: number;
  heightIn: number;
  xPercent: number;
  yPercent: number;
};

type ResizeCorner = "nw" | "ne" | "sw" | "se";

type ArtworkResizeState = {
  corner: ResizeCorner;
  anchorX: number;
  anchorY: number;
  widthIn: number;
  heightIn: number;
};

const RESIZE_HANDLES: Array<{
  corner: ResizeCorner;
  label: string;
  position: string;
  cursor: string;
}> = [
  {
    corner: "nw",
    label: "Top left",
    position: "-left-2 -top-2",
    cursor: "cursor-nwse-resize",
  },
  {
    corner: "ne",
    label: "Top right",
    position: "-right-2 -top-2",
    cursor: "cursor-nesw-resize",
  },
  {
    corner: "sw",
    label: "Bottom left",
    position: "-bottom-2 -left-2",
    cursor: "cursor-nesw-resize",
  },
  {
    corner: "se",
    label: "Bottom right",
    position: "-bottom-2 -right-2",
    cursor: "cursor-nwse-resize",
  },
];

const PRINT_PRESETS: Record<ApparelSide, ApparelPlacementPreset[]> = {
  front: [
    {
      id: "small",
      label: "Left-chest logo",
      description: "Compact logo up to 4.5 × 4.5 in",
      widthIn: 4,
      heightIn: 4,
      xPercent: 31,
      yPercent: 25,
    },
    {
      id: "standard",
      label: "Across the chest",
      description: "Logo, design or text up to 10 × 5.5 in",
      widthIn: 10,
      heightIn: 4,
      xPercent: 50,
      yPercent: 28,
    },
    {
      id: "large",
      label: "Large front design",
      description: "Large artwork such as 10 × 8 in",
      widthIn: 10,
      heightIn: 8,
      xPercent: 50,
      yPercent: 45,
    },
  ],
  back: [
    {
      id: "small",
      label: "Upper-back logo",
      description: "Compact logo up to 4.5 × 4.5 in",
      widthIn: 4,
      heightIn: 4,
      xPercent: 50,
      yPercent: 23,
    },
    {
      id: "standard",
      label: "Across the upper back",
      description: "Logo, design or text up to 10 × 5.5 in",
      widthIn: 10,
      heightIn: 4,
      xPercent: 50,
      yPercent: 28,
    },
    {
      id: "large",
      label: "Large back design",
      description: "Large artwork such as 10 × 8 in",
      widthIn: 10,
      heightIn: 8,
      xPercent: 50,
      yPercent: 45,
    },
  ],
};

const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_ARTWORK_SIZE = 20 * 1024 * 1024;

function roundDimension(value: number): number {
  return Math.round(value * 10) / 10;
}

async function getImageDimensions(file: File): Promise<{
  width: number;
  height: number;
}> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function createCartThumbnail(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(
      1,
      500 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas
      .getContext("2d")
      ?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.78);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function uploadArtwork(
  side: ApparelSide,
  artwork: LocalArtwork,
): Promise<UploadedArtwork> {
  const formData = new FormData();
  formData.set("side", side);
  formData.set("file", artwork.file);
  const response = await fetch("/api/apparel-artwork", {
    method: "POST",
    body: formData,
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `Unable to upload ${side} artwork.`);
  }
  return {
    path: String(result.path),
    originalName: String(result.originalName),
    mimeType: String(result.mimeType),
  };
}

export default function ApparelDesigner({
  product,
  bulkDiscountConfig,
  printPricing,
  blankShirtImages,
}: Props) {
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
  const inventoryConfigured = variants.some(
    (variant) => variant.apparel_garment_type,
  );
  const inventoryVariants = useMemo(
    () =>
      variants.filter(
        (variant) =>
          variant.apparel_garment_type &&
          Number(variant.inventory_quantity ?? 0) > 0,
      ),
    [variants],
  );
  const usesInventory = inventoryConfigured;
  const material = product.product_materials?.[0];
  const [quality, setQuality] = useState(
    inventoryVariants[0]?.apparel_quality ??
      variants[0]?.option_value ??
      "Standard",
  );
  const [colorName, setColorName] = useState(
    inventoryVariants[0]?.apparel_color_name ?? "Black",
  );
  const [size, setSize] = useState(inventoryVariants[0]?.apparel_size ?? "M");
  const [quantity, setQuantity] = useState(1);
  const [activeSide, setActiveSide] = useState<ApparelSide>("front");
  const [selectedPresetIds, setSelectedPresetIds] = useState<
    Record<ApparelSide, ApparelPrintClass>
  >({ front: "small", back: "small" });
  const [artworks, setArtworks] = useState<
    Partial<Record<ApparelSide, LocalArtwork>>
  >({});
  const [lockRatio, setLockRatio] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const artworkResizeRef = useRef<ArtworkResizeState | null>(null);

  const qualities = useMemo(
    () => [
      ...new Set(
        (usesInventory
          ? inventoryVariants.map((variant) => variant.apparel_quality)
          : variants.map((variant) => variant.option_value)
        ).filter(Boolean) as string[],
      ),
    ],
    [inventoryVariants, variants, usesInventory],
  );
  const availableColors = useMemo(
    () =>
      usesInventory
        ? [
            ...new Map(
              inventoryVariants
                .filter((variant) => variant.apparel_quality === quality)
                .map((variant) => [
                  variant.apparel_color_name,
                  {
                    name: variant.apparel_color_name!,
                    hex: variant.apparel_color_hex ?? "#15171B",
                  },
                ]),
            ).values(),
          ]
        : APPAREL_COLORS.map((color) => ({ name: color.name, hex: color.hex })),
    [inventoryVariants, quality, usesInventory],
  );
  const availableSizes = useMemo(
    () =>
      usesInventory
        ? [
            ...new Set(
              inventoryVariants
                .filter(
                  (variant) =>
                    variant.apparel_quality === quality &&
                    variant.apparel_color_name === colorName,
                )
                .map((variant) => variant.apparel_size)
                .filter(Boolean) as string[],
            ),
          ]
        : [...APPAREL_SIZES],
    [inventoryVariants, quality, colorName, usesInventory],
  );
  const selectedVariant = usesInventory
    ? inventoryVariants.find(
        (variant) =>
          variant.apparel_quality === quality &&
          variant.apparel_color_name === colorName &&
          variant.apparel_size === size,
      )
    : variants.find((variant) => variant.option_value === quality);
  const selectedColor = usesInventory
    ? {
        id: colorName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: colorName,
        hex:
          selectedVariant?.apparel_color_hex ??
          availableColors[0]?.hex ??
          "#15171B",
      }
    : (APPAREL_COLORS.find((color) => color.name === colorName) ??
      APPAREL_COLORS[0]);
  const selectedColourIndex = Math.max(
    0,
    availableColors.findIndex((color) => color.name === selectedColor.name),
  );
  const selectedBlankShirtImage =
    blankShirtImages[selectedColourIndex] ?? blankShirtImages[0];

  useEffect(() => {
    if (!qualities.includes(quality) && qualities[0]) setQuality(qualities[0]);
  }, [qualities, quality]);
  useEffect(() => {
    if (
      !availableColors.some((color) => color.name === colorName) &&
      availableColors[0]
    )
      setColorName(availableColors[0].name);
  }, [availableColors, colorName]);
  useEffect(() => {
    if (!availableSizes.includes(size) && availableSizes[0])
      setSize(availableSizes[0]);
  }, [availableSizes, size]);
  const activeArtwork = artworks[activeSide];
  const rawBasePrice = selectedVariant
    ? Number(selectedVariant.price)
    : Number(product.sale_price) > 0
      ? Number(product.sale_price)
      : Number(product.price);
  const markupPercent = usesInventory
    ? 0
    : Number(material?.materials.markup_percent ?? 0);
  const basePriceCents = Math.round(
    rawBasePrice * (1 + markupPercent / 100) * 100,
  );
  const backPrintPriceCents = Math.round(
    Number(product.apparel_back_print_price ?? 8) * 100,
  );
  const previewDesign: ApparelDesignData = {
    version: 1,
    garmentType: selectedVariant?.apparel_garment_type ?? "t-shirt",
    size,
    colorId: selectedColor.id,
    colorName: selectedColor.name,
    colorHex: selectedColor.hex,
    quality:
      selectedVariant?.apparel_quality ??
      selectedVariant?.option_value ??
      quality,
    sides: Object.fromEntries(
      Object.entries(artworks).map(([side, artwork]) => [
        side,
        artwork
          ? {
              artworkPath:
                "incoming/00000000-0000-0000-0000-000000000000/preview.png",
              originalName: artwork.file.name,
              mimeType: artwork.file.type,
              widthIn: artwork.widthIn,
              heightIn: artwork.heightIn,
              xPercent: artwork.xPercent,
              yPercent: artwork.yPercent,
            }
          : undefined,
      ]),
    ) as ApparelDesignData["sides"],
  };
  const unitPriceCents = getApparelUnitPriceCents(
    basePriceCents,
    backPrintPriceCents,
    previewDesign,
    printPricing,
  );
  const productionDays = normalizeProductionDays(
    material?.materials.default_production_days,
  );
  const usesSalePrice = !selectedVariant && Number(product.sale_price) > 0;
  const bulkDiscountEligible =
    bulkDiscountConfig.enabled &&
    product.bulk_discount_eligible === true &&
    (!usesSalePrice || product.allow_bulk_discount_on_sale === true);

  async function selectArtwork(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED_TYPES.has(file.type)) {
      toast.error("Use a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > MAX_ARTWORK_SIZE) {
      toast.error("Artwork must be 20 MB or smaller.");
      return;
    }

    try {
      const dimensions = await getImageDimensions(file);
      if (dimensions.width < 900 || dimensions.height < 900) {
        toast.warning("This image may print blurry at larger sizes.", {
          description: "For best results, use artwork at least 1500 px wide.",
        });
      }
      const aspectRatio = dimensions.width / dimensions.height;
      const preset =
        PRINT_PRESETS[activeSide].find(
          (option) => option.id === selectedPresetIds[activeSide],
        ) ?? PRINT_PRESETS[activeSide][0];
      const widthIn = Math.min(preset.widthIn, APPAREL_MAX_PRINT_WIDTH_IN);
      const heightIn = Math.min(
        preset.heightIn,
        APPAREL_MAX_PRINT_HEIGHT_IN,
        Math.max(1, widthIn / aspectRatio),
      );
      const previous = artworks[activeSide];
      if (previous) URL.revokeObjectURL(previous.previewUrl);
      setSelectedPresetIds((current) => ({
        ...current,
        [activeSide]: getApparelPrintClass({ widthIn, heightIn }),
      }));
      setArtworks((current) => ({
        ...current,
        [activeSide]: {
          file,
          previewUrl: URL.createObjectURL(file),
          pixelWidth: dimensions.width,
          pixelHeight: dimensions.height,
          aspectRatio,
          widthIn: roundDimension(widthIn),
          heightIn: roundDimension(heightIn),
          xPercent: preset.xPercent,
          yPercent: preset.yPercent,
        },
      }));
    } catch {
      toast.error("Unable to read that image.");
    }
  }

  function updateActiveArtwork(changes: Partial<LocalArtwork>) {
    setArtworks((current) => {
      const artwork = current[activeSide];
      if (!artwork) return current;
      return { ...current, [activeSide]: { ...artwork, ...changes } };
    });
  }

  function applyPlacementPreset(preset: ApparelPlacementPreset) {
    if (!activeArtwork) {
      setSelectedPresetIds((current) => ({
        ...current,
        [activeSide]: preset.id,
      }));
      return;
    }

    const heightIn = lockRatio
      ? Math.min(
          preset.heightIn,
          APPAREL_MAX_PRINT_HEIGHT_IN,
          Math.max(1, preset.widthIn / activeArtwork.aspectRatio),
        )
      : preset.heightIn;

    updateActiveArtwork({
      widthIn: preset.widthIn,
      heightIn: roundDimension(heightIn),
      xPercent: preset.xPercent,
      yPercent: preset.yPercent,
    });
    setSelectedPresetIds((current) => ({
      ...current,
      [activeSide]: getApparelPrintClass({
        widthIn: preset.widthIn,
        heightIn,
      }),
    }));
  }

  function updateWidth(widthIn: number) {
    if (!activeArtwork) return;
    const halfWidthPercent = (widthIn / APPAREL_MAX_PRINT_WIDTH_IN) * 50;
    const changes: Partial<LocalArtwork> = {
      widthIn: roundDimension(widthIn),
      xPercent: Math.max(
        halfWidthPercent,
        Math.min(100 - halfWidthPercent, activeArtwork.xPercent),
      ),
    };
    if (lockRatio) {
      changes.heightIn = roundDimension(
        Math.min(
          APPAREL_MAX_PRINT_HEIGHT_IN,
          Math.max(1, widthIn / activeArtwork.aspectRatio),
        ),
      );
    }
    setSelectedPresetIds((current) => ({
      ...current,
      [activeSide]: getApparelPrintClass({
        widthIn: changes.widthIn ?? activeArtwork.widthIn,
        heightIn: changes.heightIn ?? activeArtwork.heightIn,
      }),
    }));
    updateActiveArtwork(changes);
  }

  function updateHeight(heightIn: number) {
    if (!activeArtwork) return;
    const halfHeightPercent = (heightIn / APPAREL_MAX_PRINT_HEIGHT_IN) * 50;
    const changes: Partial<LocalArtwork> = {
      heightIn: roundDimension(heightIn),
      yPercent: Math.max(
        halfHeightPercent,
        Math.min(100 - halfHeightPercent, activeArtwork.yPercent),
      ),
    };
    if (lockRatio) {
      changes.widthIn = roundDimension(
        Math.min(
          APPAREL_MAX_PRINT_WIDTH_IN,
          Math.max(1, heightIn * activeArtwork.aspectRatio),
        ),
      );
    }
    setSelectedPresetIds((current) => ({
      ...current,
      [activeSide]: getApparelPrintClass({
        widthIn: changes.widthIn ?? activeArtwork.widthIn,
        heightIn: changes.heightIn ?? activeArtwork.heightIn,
      }),
    }));
    updateActiveArtwork(changes);
  }

  function positionArtwork(event: ReactPointerEvent<HTMLDivElement>) {
    if (!activeArtwork || !printAreaRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = printAreaRef.current.getBoundingClientRect();
    const halfWidthPercent =
      (activeArtwork.widthIn / APPAREL_MAX_PRINT_WIDTH_IN) * 50;
    const halfHeightPercent =
      (activeArtwork.heightIn / APPAREL_MAX_PRINT_HEIGHT_IN) * 50;
    updateActiveArtwork({
      xPercent: Math.max(
        halfWidthPercent,
        Math.min(
          100 - halfWidthPercent,
          ((event.clientX - rect.left) / rect.width) * 100,
        ),
      ),
      yPercent: Math.max(
        halfHeightPercent,
        Math.min(
          100 - halfHeightPercent,
          ((event.clientY - rect.top) / rect.height) * 100,
        ),
      ),
    });
  }

  function startArtworkResize(
    event: ReactPointerEvent<HTMLButtonElement>,
    corner: ResizeCorner,
  ) {
    if (!activeArtwork || !printAreaRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const halfWidthPercent =
      (activeArtwork.widthIn / APPAREL_MAX_PRINT_WIDTH_IN) * 50;
    const halfHeightPercent =
      (activeArtwork.heightIn / APPAREL_MAX_PRINT_HEIGHT_IN) * 50;

    artworkResizeRef.current = {
      corner,
      anchorX:
        activeArtwork.xPercent +
        (corner.endsWith("w") ? halfWidthPercent : -halfWidthPercent),
      anchorY:
        activeArtwork.yPercent +
        (corner.startsWith("n") ? halfHeightPercent : -halfHeightPercent),
      widthIn: activeArtwork.widthIn,
      heightIn: activeArtwork.heightIn,
    };
  }

  function resizeArtwork(event: ReactPointerEvent<HTMLButtonElement>) {
    const resizeState = artworkResizeRef.current;
    if (!resizeState || !activeArtwork || !printAreaRef.current) return;
    event.preventDefault();
    event.stopPropagation();

    const rect = printAreaRef.current.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
    const pointerY = ((event.clientY - rect.top) / rect.height) * 100;
    const horizontalDirection = resizeState.corner.endsWith("e") ? 1 : -1;
    const verticalDirection = resizeState.corner.startsWith("s") ? 1 : -1;
    const maximumWidthIn =
      ((horizontalDirection > 0
        ? 100 - resizeState.anchorX
        : resizeState.anchorX) /
        100) *
      APPAREL_MAX_PRINT_WIDTH_IN;
    const maximumHeightIn =
      ((verticalDirection > 0
        ? 100 - resizeState.anchorY
        : resizeState.anchorY) /
        100) *
      APPAREL_MAX_PRINT_HEIGHT_IN;
    const widthFromPointer = Math.max(
      1,
      Math.min(
        maximumWidthIn,
        (Math.abs(pointerX - resizeState.anchorX) *
          APPAREL_MAX_PRINT_WIDTH_IN) /
          100,
      ),
    );
    const heightFromPointer = Math.max(
      1,
      Math.min(
        maximumHeightIn,
        (Math.abs(pointerY - resizeState.anchorY) *
          APPAREL_MAX_PRINT_HEIGHT_IN) /
          100,
      ),
    );

    let widthIn = widthFromPointer;
    let heightIn = heightFromPointer;

    if (lockRatio) {
      const widthScale = widthFromPointer / resizeState.widthIn;
      const heightScale = heightFromPointer / resizeState.heightIn;
      const requestedScale =
        Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
          ? widthScale
          : heightScale;
      const minimumScale = Math.max(
        1 / resizeState.widthIn,
        1 / resizeState.heightIn,
      );
      const maximumScale = Math.min(
        maximumWidthIn / resizeState.widthIn,
        maximumHeightIn / resizeState.heightIn,
      );
      const scale = Math.max(
        minimumScale,
        Math.min(maximumScale, requestedScale),
      );
      widthIn = resizeState.widthIn * scale;
      heightIn = resizeState.heightIn * scale;
    }

    const widthPercent = (widthIn / APPAREL_MAX_PRINT_WIDTH_IN) * 100;
    const heightPercent = (heightIn / APPAREL_MAX_PRINT_HEIGHT_IN) * 100;
    const movingX = resizeState.anchorX + horizontalDirection * widthPercent;
    const movingY = resizeState.anchorY + verticalDirection * heightPercent;
    const nextArtwork = {
      widthIn: roundDimension(widthIn),
      heightIn: roundDimension(heightIn),
      xPercent: (resizeState.anchorX + movingX) / 2,
      yPercent: (resizeState.anchorY + movingY) / 2,
    };

    setSelectedPresetIds((current) => ({
      ...current,
      [activeSide]: getApparelPrintClass(nextArtwork),
    }));
    updateActiveArtwork(nextArtwork);
  }

  function finishArtworkResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    artworkResizeRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function handleAddToCart() {
    if (!artworks.front && !artworks.back) {
      toast.error("Upload artwork for the front, back, or both sides.");
      return;
    }
    if (usesInventory && !selectedVariant) {
      toast.error("That size and colour combination is unavailable.");
      return;
    }
    if (isAdding) return;

    setIsAdding(true);
    try {
      const uploadedEntries = await Promise.all(
        (Object.entries(artworks) as [ApparelSide, LocalArtwork][]).map(
          async ([side, artwork]) =>
            [side, await uploadArtwork(side, artwork)] as const,
        ),
      );
      const uploaded = Object.fromEntries(uploadedEntries) as Partial<
        Record<ApparelSide, UploadedArtwork>
      >;
      const sides: ApparelDesignData["sides"] = {};

      for (const side of ["front", "back"] as const) {
        const artwork = artworks[side];
        const stored = uploaded[side];
        if (!artwork || !stored) continue;
        const placement: ApparelArtworkPlacement = {
          artworkPath: stored.path,
          originalName: stored.originalName,
          mimeType: stored.mimeType,
          widthIn: artwork.widthIn,
          heightIn: artwork.heightIn,
          xPercent: roundDimension(artwork.xPercent),
          yPercent: roundDimension(artwork.yPercent),
        };
        sides[side] = placement;
      }

      const design: ApparelDesignData = { ...previewDesign, sides };
      const thumbnailSource = artworks.front ?? artworks.back;
      const thumbnail = thumbnailSource
        ? await createCartThumbnail(thumbnailSource.file)
        : "";

      addToCart({
        id: product.id,
        name: product.name,
        variantId: selectedVariant?.id,
        variantName: selectedVariant?.option_value,
        materialId: usesInventory
          ? "apparel-dtf-print"
          : (material?.material_id ?? "apparel-dtf-print"),
        materialName: usesInventory
          ? "DTF apparel print"
          : (material?.materials.name ?? "DTF apparel print"),
        quantity,
        price: unitPriceCents / 100,
        image: thumbnail,
        productionDays,
        bulkDiscountEligible,
        configurationId: crypto.randomUUID(),
        design,
      });

      toast.success("Custom apparel added to cart", {
        description: `${selectedColor.name} · ${size} · ${Object.keys(sides).join(" + ")}`,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save the design.",
      );
    } finally {
      setIsAdding(false);
    }
  }

  const shirtStroke =
    selectedColor.hex.toLowerCase() === "#f8fafc" ||
    selectedColor.hex.toLowerCase() === "#ffffff"
      ? "#94a3b8"
      : "#0f172a";
  const isHoodie = selectedVariant?.apparel_garment_type === "hoodie";
  const garmentMockupImage = getGarmentMockupImage({
    side: activeSide,
    garmentType: isHoodie ? "hoodie" : "t-shirt",
    colorName: selectedColor.name,
    frontImage: selectedBlankShirtImage,
  });
  const garmentPrintArea = getGarmentPrintArea({
    garmentType: isHoodie ? "hoodie" : "t-shirt",
    size,
  });
  const availableStock = usesInventory
    ? Number(selectedVariant?.inventory_quantity ?? 0)
    : 100;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.12fr)_minmax(22rem,0.88fr)]">
      <section className="rounded-3xl bg-slate-950 p-5 shadow-2xl sm:p-8">
        <div className="mb-5 flex items-center justify-between gap-4 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
              Live mockup
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              {activeSide === "front" ? "Front" : "Back"} view
            </h2>
          </div>
          <div className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-300">
            Drag artwork to position
          </div>
        </div>

        <div className="relative mx-auto aspect-square max-w-xl overflow-hidden rounded-2xl bg-white p-4">
          {garmentMockupImage ? (
            <img
              src={garmentMockupImage}
              alt={`${selectedColor.name} ${isHoodie ? "hoodie" : "T-shirt"} ${activeSide} mockup`}
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain p-3"
            />
          ) : (
            <svg
              viewBox="0 0 600 700"
              className="absolute inset-0 h-full w-full"
              aria-label={`${selectedColor.name} ${isHoodie ? "hoodie" : "T-shirt"} ${activeSide} mockup`}
            >
              <path
                d={
                  isHoodie
                    ? "M203 102 88 151 18 292l93 49 49-73v362h280V268l49 73 93-49-70-141-115-49c-15-45-51-78-97-78s-82 33-97 78Z"
                    : "M205 70 92 126 20 266l91 51 50-76v389h278V241l50 76 91-51-72-140-113-56c-25 41-165 41-190 0Z"
                }
                fill={selectedColor.hex}
                stroke={shirtStroke}
                strokeWidth="5"
                strokeLinejoin="round"
              />
              {isHoodie && activeSide === "front" ? (
                <>
                  <path
                    d="M215 105c22-72 148-72 170 0-38 28-132 28-170 0Z"
                    fill="#020617"
                    fillOpacity=".2"
                    stroke={shirtStroke}
                    strokeWidth="4"
                  />
                  <path
                    d="M218 470h164v96H218c-24-28-24-68 0-96Z"
                    fill="#020617"
                    fillOpacity=".12"
                    stroke={shirtStroke}
                    strokeWidth="3"
                  />
                </>
              ) : activeSide === "front" ? (
                <path
                  d="M205 70c18 100 172 100 190 0-34-16-53-25-67-31-17 33-39 50-28 50s-11-17-28-50c-14 6-33 15-67 31Z"
                  fill="#020617"
                  fillOpacity=".18"
                  stroke={shirtStroke}
                  strokeWidth="4"
                />
              ) : (
                <path
                  d="M220 77c30 30 130 30 160 0"
                  fill="none"
                  stroke={shirtStroke}
                  strokeWidth="4"
                  opacity=".55"
                />
              )}
            </svg>
          )}

          <div
            ref={printAreaRef}
            className="absolute left-1/2 top-[24%] touch-none border border-dashed border-yellow-500/90"
            style={{
              width: `${garmentPrintArea.widthPercent}%`,
              height: `${garmentPrintArea.heightPercent}%`,
              transform: "translateX(-50%)",
            }}
            onPointerDown={positionArtwork}
            onPointerMove={(event) => {
              if (event.buttons === 1) positionArtwork(event);
            }}
          >
            {activeArtwork ? (
              <div
                className="pointer-events-none absolute rounded-sm outline outline-2 outline-offset-2 outline-yellow-400"
                style={{
                  width: `${(activeArtwork.widthIn / APPAREL_MAX_PRINT_WIDTH_IN) * 100}%`,
                  height: `${(activeArtwork.heightIn / APPAREL_MAX_PRINT_HEIGHT_IN) * 100}%`,
                  left: `${activeArtwork.xPercent}%`,
                  top: `${activeArtwork.yPercent}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <img
                  src={activeArtwork.previewUrl}
                  alt={`${activeSide} artwork preview`}
                  draggable={false}
                  className="h-full w-full select-none object-fill drop-shadow-lg"
                />
                {RESIZE_HANDLES.map(({ corner, position, cursor, label }) => (
                  <button
                    key={corner}
                    type="button"
                    aria-label={`${label} resize handle`}
                    title="Drag to resize artwork"
                    className={`pointer-events-auto absolute ${position} ${cursor} h-4 w-4 rounded-full border-[3px] border-yellow-400 bg-white shadow-[0_0_0_2px_rgba(15,23,42,0.85)] transition-transform hover:scale-125 focus:scale-125 focus:outline-none`}
                    onPointerDown={(event) => startArtworkResize(event, corner)}
                    onPointerMove={(event) => {
                      if (event.buttons === 1) resizeArtwork(event);
                    }}
                    onPointerUp={finishArtworkResize}
                    onPointerCancel={finishArtworkResize}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm font-semibold text-yellow-950/70">
                Upload {activeSide} artwork
              </div>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-xs leading-5 text-slate-400">
          Mockup is a visual placement guide. On-screen size and scale may
          differ slightly from the actual print. The width and height you enter
          are the production dimensions, and your original full-resolution file
          is retained for production.
        </p>
      </section>

      <section className="space-y-6 rounded-3xl bg-white p-6 shadow-xl sm:p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-600">
            Design your shirt
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            Make it yours
          </h2>
        </div>

        {qualities.length > 0 ? (
          <fieldset>
            <legend className="mb-3 font-bold text-slate-900">
              1. Quality
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {qualities.map((qualityOption) => {
                const qualityPrice =
                  inventoryVariants.find(
                    (variant) => variant.apparel_quality === qualityOption,
                  )?.price ??
                  variants.find(
                    (variant) => variant.option_value === qualityOption,
                  )?.price;
                return (
                  <button
                    key={qualityOption}
                    type="button"
                    onClick={() => setQuality(qualityOption)}
                    className={`rounded-xl border-2 p-3 text-left transition ${quality === qualityOption ? "border-yellow-400 bg-yellow-50" : "border-slate-200 hover:border-slate-400"}`}
                  >
                    <span className="block font-bold">{qualityOption}</span>
                    <span className="text-sm text-slate-500">
                      From CAD ${Number(qualityPrice ?? 0).toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <fieldset>
          <legend className="mb-3 font-bold text-slate-900">
            2. Shirt colour
          </legend>
          <div className="flex flex-wrap gap-3">
            {availableColors.map((color) => (
              <button
                key={color.name}
                type="button"
                onClick={() => setColorName(color.name)}
                aria-label={color.name}
                title={color.name}
                className={`h-11 w-11 rounded-full border-4 shadow-sm transition ${colorName === color.name ? "border-yellow-400 scale-110" : "border-white ring-1 ring-slate-300"}`}
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
          <p className="mt-2 text-sm font-medium text-slate-600">
            {selectedColor.name}
          </p>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="font-bold text-slate-900">
            3. Size
            <select
              value={size}
              onChange={(event) => setSize(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal"
            >
              {availableSizes.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="font-bold text-slate-900">
            Quantity
            <input
              type="number"
              min="1"
              max={availableStock}
              value={quantity}
              onChange={(event) =>
                setQuantity(
                  Math.min(
                    availableStock,
                    Math.max(1, Number(event.target.value) || 1),
                  ),
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal"
            />
            {usesInventory ? (
              <span className="mt-2 block text-xs font-medium text-slate-500">
                {availableStock} currently in stock
              </span>
            ) : null}
          </label>
        </div>

        <div>
          <div className="mb-3 font-bold text-slate-900">
            4. Artwork and placement
          </div>
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            {(["front", "back"] as const).map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => setActiveSide(side)}
                className={`rounded-lg px-4 py-3 font-bold capitalize ${activeSide === side ? "bg-slate-950 text-white shadow" : "text-slate-600"}`}
              >
                {side} {artworks[side] ? "✓" : ""}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <div className="mb-2 text-sm font-bold text-slate-700">
              Choose {activeSide} print type
            </div>
            <div className="grid gap-2">
              {PRINT_PRESETS[activeSide].map((preset) => {
                const surchargeCents = getApparelPrintSurchargeCents(
                  preset,
                  printPricing,
                );
                const selected = selectedPresetIds[activeSide] === preset.id;

                return (
                  <button
                    key={`${activeSide}-${preset.id}`}
                    type="button"
                    onClick={() => applyPlacementPreset(preset)}
                    className={`flex items-center justify-between gap-4 rounded-xl border-2 p-3 text-left transition ${selected ? "border-yellow-400 bg-yellow-50" : "border-slate-200 hover:border-slate-400"}`}
                  >
                    <span>
                      <span className="block font-bold text-slate-900">
                        {preset.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {preset.description}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-slate-700">
                      {surchargeCents > 0
                        ? `+ CAD $${(surchargeCents / 100).toFixed(2)}`
                        : "Included"}
                    </span>
                  </button>
                );
              })}
            </div>
            {artworks.front && artworks.back ? (
              <p className="mt-2 text-xs font-medium text-slate-500">
                Front and back selected: an additional CAD $
                {(backPrintPriceCents / 100).toFixed(2)} per shirt is added for
                the second printed side.
              </p>
            ) : null}
          </div>

          <label className="mt-4 block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-5 text-center hover:border-yellow-400 hover:bg-yellow-50">
            <span className="block font-bold text-slate-900">
              Upload {activeSide} artwork
            </span>
            <span className="mt-1 block text-sm text-slate-500">
              PNG recommended · JPG or WebP · Maximum 20 MB
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={selectArtwork}
              className="sr-only"
            />
          </label>
        </div>

        {activeArtwork ? (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate font-bold text-slate-900">
                  {activeArtwork.file.name}
                </div>
                <div className="text-xs text-slate-500">
                  Exact production dimensions
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(activeArtwork.previewUrl);
                  setArtworks((current) => {
                    const next = { ...current };
                    delete next[activeSide];
                    return next;
                  });
                }}
                className="text-sm font-bold text-red-600"
              >
                Remove
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <span className="font-bold text-slate-900">
                {
                  APPAREL_PRINT_CLASS_DETAILS[
                    getApparelPrintClass(activeArtwork)
                  ].label
                }
              </span>
              <span className="ml-2 text-slate-500">
                {
                  APPAREL_PRINT_CLASS_DETAILS[
                    getApparelPrintClass(activeArtwork)
                  ].description
                }
              </span>
            </div>

            {Math.min(
              activeArtwork.pixelWidth / activeArtwork.widthIn,
              activeArtwork.pixelHeight / activeArtwork.heightIn,
            ) < 150 ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900">
                Low-resolution warning: approximately{" "}
                {Math.round(
                  Math.min(
                    activeArtwork.pixelWidth / activeArtwork.widthIn,
                    activeArtwork.pixelHeight / activeArtwork.heightIn,
                  ),
                )}{" "}
                DPI at this print size. Reduce the dimensions or upload a larger
                image.
              </div>
            ) : (
              <div className="text-sm font-medium text-emerald-700">
                Resolution looks suitable for this print size.
              </div>
            )}

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={lockRatio}
                onChange={(event) => setLockRatio(event.target.checked)}
                className="h-4 w-4 accent-yellow-500"
              />
              Lock artwork proportions
            </label>

            <label className="block text-sm font-bold text-slate-700">
              Width: {activeArtwork.widthIn.toFixed(1)} in
              <input
                type="range"
                min="1"
                max={APPAREL_MAX_PRINT_WIDTH_IN}
                step="0.1"
                value={activeArtwork.widthIn}
                onChange={(event) => updateWidth(Number(event.target.value))}
                className="mt-2 w-full accent-yellow-500"
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Height: {activeArtwork.heightIn.toFixed(1)} in
              <input
                type="range"
                min="1"
                max={APPAREL_MAX_PRINT_HEIGHT_IN}
                step="0.1"
                value={activeArtwork.heightIn}
                onChange={(event) => updateHeight(Number(event.target.value))}
                className="mt-2 w-full accent-yellow-500"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-700">
                Horizontal
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={activeArtwork.xPercent}
                  onChange={(event) =>
                    updateActiveArtwork({
                      xPercent: Number(event.target.value),
                    })
                  }
                  className="mt-2 w-full accent-yellow-500"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Vertical
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={activeArtwork.yPercent}
                  onChange={(event) =>
                    updateActiveArtwork({
                      yPercent: Number(event.target.value),
                    })
                  }
                  className="mt-2 w-full accent-yellow-500"
                />
              </label>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl bg-slate-950 p-5 text-white">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-sm text-slate-400">Live total</div>
              <div className="text-3xl font-bold">
                CAD ${((unitPriceCents * quantity) / 100).toFixed(2)}
              </div>
            </div>
            <div className="text-right text-sm text-slate-300">
              ${(unitPriceCents / 100).toFixed(2)} each
            </div>
          </div>
          {artworks.front && artworks.back ? (
            <p className="mt-2 text-xs text-yellow-300">
              Includes CAD ${(backPrintPriceCents / 100).toFixed(2)} per shirt
              for the second print side, plus the selected print-size charges.
            </p>
          ) : Object.values(artworks).some(Boolean) ? (
            <p className="mt-2 text-xs text-yellow-300">
              Price includes the selected print-size class.
            </p>
          ) : null}
          {productionDays > 0 ? (
            <p className="mt-2 text-xs text-slate-400">
              Estimated {formatProductionDuration(productionDays)} production
              after payment.
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void handleAddToCart()}
          disabled={
            isAdding ||
            (!usesInventory && !material) ||
            (usesInventory && (!selectedVariant || availableStock < 1))
          }
          className="w-full rounded-xl bg-yellow-400 py-4 text-lg font-bold text-slate-950 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAdding
            ? "Saving Design..."
            : `Add Custom ${isHoodie ? "Hoodie" : "T-Shirt"} to Cart`}
        </button>
      </section>
    </div>
  );
}
