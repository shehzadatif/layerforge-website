export const APPAREL_ARTWORK_BUCKET = "customer-artwork";
export const APPAREL_MAX_PRINT_WIDTH_IN = 12;
export const APPAREL_MAX_PRINT_HEIGHT_IN = 16;

export const APPAREL_PRINT_PRICING_SETTING_KEYS = [
  "apparel_standard_print_surcharge",
  "apparel_large_print_surcharge",
] as const;

export type ApparelPrintClass = "small" | "standard" | "large";

export type ApparelPrintPricingConfig = {
  standardSurchargeCents: number;
  largeSurchargeCents: number;
};

export const DEFAULT_APPAREL_PRINT_PRICING: ApparelPrintPricingConfig = {
  standardSurchargeCents: 400,
  largeSurchargeCents: 800,
};

export const APPAREL_PRINT_CLASS_DETAILS: Record<
  ApparelPrintClass,
  { label: string; description: string }
> = {
  small: {
    label: "Small logo",
    description: "Up to 4.5 × 4.5 in",
  },
  standard: {
    label: "Standard chest",
    description: "Up to 10 × 5.5 in",
  },
  large: {
    label: "Large print",
    description: "Up to 12 × 16 in",
  },
};

export const APPAREL_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const;

export const APPAREL_COLORS = [
  { id: "black", name: "Black", hex: "#15171b" },
  { id: "white", name: "White", hex: "#f8fafc" },
  { id: "navy", name: "Navy", hex: "#172554" },
  { id: "royal-blue", name: "Royal Blue", hex: "#1d4ed8" },
  { id: "red", name: "Red", hex: "#b91c1c" },
  { id: "forest-green", name: "Forest Green", hex: "#166534" },
  { id: "sport-grey", name: "Sport Grey", hex: "#9ca3af" },
  { id: "yellow", name: "Yellow", hex: "#facc15" },
] as const;

export type ApparelSide = "front" | "back";

export type ApparelArtworkPlacement = {
  artworkPath: string;
  originalName: string;
  mimeType: string;
  widthIn: number;
  heightIn: number;
  xPercent: number;
  yPercent: number;
};

export type ApparelDesignData = {
  version: 1;
  garmentType?: "t-shirt" | "hoodie";
  size: string;
  colorId: string;
  colorName: string;
  colorHex: string;
  quality: string;
  sides: Partial<Record<ApparelSide, ApparelArtworkPlacement>>;
};

function priceSetting(
  settings: ReadonlyMap<string, string | null | undefined>,
  key: string,
  fallbackCents: number,
): number {
  const value = Number(settings.get(key));
  if (!Number.isFinite(value) || value < 0 || value > 500) {
    return fallbackCents;
  }
  return Math.round(value * 100);
}

export function parseApparelPrintPricingConfig(
  settings: ReadonlyMap<string, string | null | undefined>,
): ApparelPrintPricingConfig {
  return {
    standardSurchargeCents: priceSetting(
      settings,
      "apparel_standard_print_surcharge",
      DEFAULT_APPAREL_PRINT_PRICING.standardSurchargeCents,
    ),
    largeSurchargeCents: priceSetting(
      settings,
      "apparel_large_print_surcharge",
      DEFAULT_APPAREL_PRINT_PRICING.largeSurchargeCents,
    ),
  };
}

export class ApparelDesignValidationError extends Error {}

function requiredText(
  value: unknown,
  label: string,
  maxLength: number,
): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new ApparelDesignValidationError(`${label} is required.`);
  if (text.length > maxLength) {
    throw new ApparelDesignValidationError(`${label} is too long.`);
  }
  return text;
}

function boundedNumber(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new ApparelDesignValidationError(
      `${label} must be between ${minimum} and ${maximum}.`,
    );
  }
  return Math.round(number * 100) / 100;
}

function parsePlacement(
  value: unknown,
  side: ApparelSide,
): ApparelArtworkPlacement {
  if (!value || typeof value !== "object") {
    throw new ApparelDesignValidationError(`${side} artwork is invalid.`);
  }

  const input = value as Record<string, unknown>;
  const artworkPath = requiredText(input.artworkPath, `${side} artwork`, 300);

  if (!/^incoming\/[a-f0-9-]{36}\/[a-zA-Z0-9._-]+$/.test(artworkPath)) {
    throw new ApparelDesignValidationError(`${side} artwork path is invalid.`);
  }

  return {
    artworkPath,
    originalName: requiredText(input.originalName, `${side} filename`, 180),
    mimeType: requiredText(input.mimeType, `${side} file type`, 80),
    widthIn: boundedNumber(
      input.widthIn,
      `${side} print width`,
      1,
      APPAREL_MAX_PRINT_WIDTH_IN,
    ),
    heightIn: boundedNumber(
      input.heightIn,
      `${side} print height`,
      1,
      APPAREL_MAX_PRINT_HEIGHT_IN,
    ),
    xPercent: boundedNumber(
      input.xPercent,
      `${side} horizontal position`,
      0,
      100,
    ),
    yPercent: boundedNumber(
      input.yPercent,
      `${side} vertical position`,
      0,
      100,
    ),
  };
}

export function parseApparelDesignData(value: unknown): ApparelDesignData {
  if (!value || typeof value !== "object") {
    throw new ApparelDesignValidationError("T-shirt design is required.");
  }

  const input = value as Record<string, unknown>;
  const size = requiredText(input.size, "Apparel size", 12).toUpperCase();
  const colorId = requiredText(input.colorId, "Apparel colour", 60);
  if (!/^(?:XS|S|M|L|XL|[2-9]XL)$/i.test(size)) {
    throw new ApparelDesignValidationError("Select a valid apparel size.");
  }
  const legacyColor = APPAREL_COLORS.find((option) => option.id === colorId);
  const colorName = requiredText(
    input.colorName ?? legacyColor?.name,
    "Apparel colour",
    60,
  );
  const colorHex = requiredText(
    input.colorHex ?? legacyColor?.hex,
    "Apparel colour swatch",
    7,
  );
  if (!/^#[0-9a-f]{6}$/i.test(colorHex)) {
    throw new ApparelDesignValidationError("Select a valid apparel colour.");
  }
  const garmentType = input.garmentType === "hoodie" ? "hoodie" : "t-shirt";

  const sidesInput =
    input.sides && typeof input.sides === "object"
      ? (input.sides as Record<string, unknown>)
      : {};
  const sides: ApparelDesignData["sides"] = {};

  if (sidesInput.front) sides.front = parsePlacement(sidesInput.front, "front");
  if (sidesInput.back) sides.back = parsePlacement(sidesInput.back, "back");
  if (!sides.front && !sides.back) {
    throw new ApparelDesignValidationError(
      "Upload artwork for the front, back, or both sides.",
    );
  }

  return {
    version: 1,
    garmentType,
    size,
    colorId,
    colorName,
    colorHex: colorHex.toUpperCase(),
    quality: requiredText(input.quality, "T-shirt quality", 100),
    sides,
  };
}

export function getApparelPrintedSideCount(design: ApparelDesignData): number {
  return (
    Number(Boolean(design.sides.front)) + Number(Boolean(design.sides.back))
  );
}

export function getApparelPrintClass(
  placement: Pick<ApparelArtworkPlacement, "widthIn" | "heightIn">,
): ApparelPrintClass {
  if (placement.widthIn <= 4.5 && placement.heightIn <= 4.5) return "small";
  if (placement.widthIn <= 10 && placement.heightIn <= 5.5) return "standard";
  return "large";
}

export function getApparelPrintSurchargeCents(
  placement: Pick<ApparelArtworkPlacement, "widthIn" | "heightIn">,
  pricing: ApparelPrintPricingConfig,
): number {
  const printClass = getApparelPrintClass(placement);
  if (printClass === "standard") return pricing.standardSurchargeCents;
  if (printClass === "large") return pricing.largeSurchargeCents;
  return 0;
}

export function getApparelUnitPriceCents(
  basePriceCents: number,
  additionalSidePriceCents: number,
  design: ApparelDesignData,
  pricing: ApparelPrintPricingConfig = DEFAULT_APPAREL_PRINT_PRICING,
): number {
  const placements = Object.values(design.sides).filter(
    (placement): placement is ApparelArtworkPlacement => Boolean(placement),
  );

  const printSizeSurcharges = placements.reduce(
    (total, placement) =>
      total + getApparelPrintSurchargeCents(placement, pricing),
    0,
  );

  return (
    basePriceCents +
    printSizeSurcharges +
    Math.max(0, placements.length - 1) * additionalSidePriceCents
  );
}
