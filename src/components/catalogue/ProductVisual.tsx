import type { LucideIcon } from "lucide-react";
import {
  Award,
  Baby,
  Backpack,
  Badge,
  BookOpen,
  Box,
  BriefcaseBusiness,
  Car,
  ChefHat,
  CircleDot,
  Clock3,
  Coffee,
  Crown,
  Cuboid,
  CupSoda,
  Disc3,
  Footprints,
  Frame,
  Gift,
  GraduationCap,
  GlassWater,
  Hammer,
  HardHat,
  Heart,
  House,
  Image,
  KeyRound,
  Layers,
  Luggage,
  Magnet,
  Medal,
  Monitor,
  Mouse,
  Notebook,
  Package,
  Palette,
  PanelTop,
  PanelsTopLeft,
  Pen,
  QrCode,
  ScanLine,
  School,
  Shirt,
  ShoppingBag,
  Signpost,
  Smartphone,
  Sticker,
  Store,
  Tag,
  Tags,
  Trophy,
  Utensils,
  WalletCards,
  Wrench,
} from "lucide-react";

type Props = {
  name: string;
  category: string;
};

const productPhotos: Record<string, string> = {
  Tumblers: "/images/catalogue/facebook/layer-forge-custom-tumbler.jpg",
  "Water bottles": "/images/catalogue/facebook/layer-forge-branded-water-bottle.jpg",
  "Thermos bottles": "/images/catalogue/facebook/layer-forge-engraved-bottle.jpg",
  "Travel bottles": "/images/catalogue/facebook/layer-forge-engraved-bottle.jpg",
  Pens: "/images/catalogue/facebook/layer-forge-personalized-pens.jpg",
  "T-shirts": "/images/apparel/custom-apparel-layerforge.webp",
  "Phone cases": "/images/uv-printing/uv-phone-cases.webp",
  "Tool & battery holders": "/images/3d-printing/functional-products.webp",
  "Plaques & awards": "/images/laser-engraving/engraved-products.webp",
};

function productIcon(name: string, category: string): LucideIcon {
  const item = name.toLowerCase();

  if (item.includes("mug") || item.includes("espresso")) return Coffee;
  if (item.includes("bottle") || item.includes("thermos")) return GlassWater;
  if (item.includes("tumbler") || item.includes("cup")) return CupSoda;

  if (item.includes("baby")) return Baby;
  if (item.includes("apron")) return ChefHat;
  if (item.includes("cap") || item.includes("hat")) return Crown;
  if (item.includes("workwear")) return HardHat;
  if (item.includes("backpack")) return Backpack;
  if (item.includes("shoe")) return Footprints;
  if (item.includes("bag") || item.includes("tote")) return ShoppingBag;
  if (item.includes("patch")) return Badge;
  if (category === "apparel") return Shirt;

  if (item.includes("mouse pad")) return Mouse;
  if (item.includes("desk mat")) return Monitor;
  if (item.includes("canvas") || item.includes("photo panel") || item.includes("wall panel")) return Image;
  if (item.includes("frame")) return Frame;
  if (item.includes("magnet")) return Magnet;
  if (item.includes("coaster")) return Layers;
  if (item.includes("notebook")) return Notebook;
  if (item.includes("bookmark")) return BookOpen;
  if (item.includes("clock")) return Clock3;
  if (item.includes("pen")) return Pen;
  if (item.includes("card holder")) return WalletCards;
  if (item.includes("tile") || item.includes("switch cover")) return PanelsTopLeft;
  if (category === "home-office") return Palette;

  if (item.includes("gift box") || item.includes("gift set")) return Gift;
  if (item.includes("mailer") || item.includes("packaging") || item.includes("presentation")) return Package;
  if (category === "boxes") return Box;

  if (item.includes("qr code")) return QrCode;
  if (item.includes("menu")) return Utensils;
  if (item.includes("reception") || item.includes("market sign")) return Store;
  if (item.includes("house number")) return House;
  if (item.includes("memorial")) return Heart;
  if (item.includes("table number") || item.includes("reserved")) return PanelTop;
  if (category === "signs") return Signpost;

  if (item.includes("barcode") || item.includes("serial")) return ScanLine;
  if (item.includes("sticker") || item.includes("decal")) return Sticker;
  if (item.includes("name") || item.includes("equipment")) return Tag;
  if (category === "labels") return Tags;

  if (item.includes("keychain")) return KeyRound;
  if (item.includes("phone case")) return Smartphone;
  if (item.includes("ornament")) return CircleDot;
  if (item.includes("luggage")) return Luggage;
  if (item.includes("plaque") || item.includes("award")) return Trophy;
  if (item.includes("wallet")) return WalletCards;
  if (item.includes("badge") || item.includes("pin")) return Badge;
  if (item.includes("medal")) return Medal;
  if (item.includes("graduation")) return GraduationCap;
  if (item.includes("teacher")) return School;
  if (item.includes("memorial")) return Heart;
  if (category === "gifts") return Gift;

  if (item.includes("restaurant")) return Utensils;
  if (item.includes("market") || item.includes("store")) return Store;
  if (item.includes("school") || item.includes("club")) return School;
  if (item.includes("wedding")) return Heart;
  if (category === "packages") return BriefcaseBusiness;

  if (item.includes("car")) return Car;
  if (item.includes("tool") || item.includes("workshop")) return Hammer;
  if (item.includes("replacement") || item.includes("bracket") || item.includes("mount")) return Wrench;
  if (item.includes("display")) return PanelTop;
  if (category === "custom") return Cuboid;

  return Award;
}

export default function ProductVisual({ name, category }: Props) {
  const photo = productPhotos[name];
  const Icon = productIcon(name, category);

  return (
    <div className="relative mb-5 h-32 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-yellow-50 via-white to-slate-100">
      {photo ? (
        <img
          src={photo}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center" aria-hidden="true">
          <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-yellow-300/35" />
          <div className="absolute -bottom-8 -left-5 h-24 w-24 rounded-full bg-slate-300/35" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-sm ring-1 ring-slate-200">
            <Icon size={46} strokeWidth={1.65} />
          </div>
        </div>
      )}
    </div>
  );
}
