export const APPAREL_ARTWORK_BUCKET = "customer-artwork";
export const APPAREL_MAX_PRINT_WIDTH_IN = 12;
export const APPAREL_MAX_PRINT_HEIGHT_IN = 16;

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
  size: string;
  colorId: string;
  colorName: string;
  colorHex: string;
  quality: string;
  sides: Partial<Record<ApparelSide, ApparelArtworkPlacement>>;
};

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
  const size = requiredText(input.size, "T-shirt size", 10).toUpperCase();
  const colorId = requiredText(input.colorId, "T-shirt colour", 40);
  const color = APPAREL_COLORS.find((option) => option.id === colorId);

  if (!APPAREL_SIZES.includes(size as (typeof APPAREL_SIZES)[number])) {
    throw new ApparelDesignValidationError("Select a valid T-shirt size.");
  }
  if (!color) {
    throw new ApparelDesignValidationError("Select a valid T-shirt colour.");
  }

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
    size,
    colorId: color.id,
    colorName: color.name,
    colorHex: color.hex,
    quality: requiredText(input.quality, "T-shirt quality", 100),
    sides,
  };
}

export function getApparelPrintedSideCount(design: ApparelDesignData): number {
  return (
    Number(Boolean(design.sides.front)) + Number(Boolean(design.sides.back))
  );
}

export function getApparelUnitPriceCents(
  basePriceCents: number,
  backPrintPriceCents: number,
  design: ApparelDesignData,
): number {
  return (
    basePriceCents +
    Math.max(0, getApparelPrintedSideCount(design) - 1) * backPrintPriceCents
  );
}
