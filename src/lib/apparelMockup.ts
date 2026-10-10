import type { ApparelSide } from "./apparelDesigner";

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
