import {
  APPAREL_MAX_PRINT_HEIGHT_IN,
  APPAREL_MAX_PRINT_WIDTH_IN,
  type ApparelSide,
} from "./apparelDesigner";

const TSHIRT_BACK_MOCKUPS: Record<string, string> = {
  black: "/images/apparel/gildan-g640-black-back.png",
  white: "/images/apparel/gildan-g640-white-back.png",
};

type GarmentMockupInput = {
  side: ApparelSide;
  garmentType: "t-shirt" | "hoodie";
  colorName: string;
  frontImage?: string;
};

type GarmentPrintAreaInput = {
  garmentType: "t-shirt" | "hoodie";
  size: string;
};

type GarmentDimensions = {
  bodyWidthIn: number;
  bodyLengthIn: number;
};

const TSHIRT_DIMENSIONS: Record<string, GarmentDimensions> = {
  XS: { bodyWidthIn: 16, bodyLengthIn: 27 },
  S: { bodyWidthIn: 18, bodyLengthIn: 28 },
  M: { bodyWidthIn: 20, bodyLengthIn: 29 },
  L: { bodyWidthIn: 22, bodyLengthIn: 30 },
  XL: { bodyWidthIn: 24, bodyLengthIn: 31 },
  "2XL": { bodyWidthIn: 26, bodyLengthIn: 32 },
  "3XL": { bodyWidthIn: 28, bodyLengthIn: 33 },
  "4XL": { bodyWidthIn: 30, bodyLengthIn: 34 },
  "5XL": { bodyWidthIn: 32, bodyLengthIn: 35 },
};

const HOODIE_DIMENSIONS: Record<string, GarmentDimensions> = {
  S: { bodyWidthIn: 20, bodyLengthIn: 27 },
  M: { bodyWidthIn: 22, bodyLengthIn: 28 },
  L: { bodyWidthIn: 24, bodyLengthIn: 29 },
  XL: { bodyWidthIn: 26, bodyLengthIn: 30 },
  "2XL": { bodyWidthIn: 28, bodyLengthIn: 31 },
  "3XL": { bodyWidthIn: 30, bodyLengthIn: 32 },
};

const GARMENT_BODY_WIDTH_PERCENT = 52;
const GARMENT_BODY_HEIGHT_PERCENT = 82;

export function getGarmentMockupImage({
  side,
  garmentType,
  colorName,
  frontImage,
}: GarmentMockupInput): string | undefined {
  if (side === "front") return frontImage;
  if (garmentType !== "t-shirt") return undefined;

  return TSHIRT_BACK_MOCKUPS[colorName.trim().toLowerCase()];
}

export function getGarmentPrintArea({
  garmentType,
  size,
}: GarmentPrintAreaInput): { widthPercent: number; heightPercent: number } {
  const dimensions =
    (garmentType === "hoodie" ? HOODIE_DIMENSIONS : TSHIRT_DIMENSIONS)[
      size.trim().toUpperCase()
    ] ?? (garmentType === "hoodie" ? HOODIE_DIMENSIONS.L : TSHIRT_DIMENSIONS.L);

  return {
    widthPercent:
      (GARMENT_BODY_WIDTH_PERCENT * APPAREL_MAX_PRINT_WIDTH_IN) /
      dimensions.bodyWidthIn,
    heightPercent:
      (GARMENT_BODY_HEIGHT_PERCENT * APPAREL_MAX_PRINT_HEIGHT_IN) /
      dimensions.bodyLengthIn,
  };
}
