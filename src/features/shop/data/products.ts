import type { Product } from "../types/product";

export const products: Product[] = [
  {
    id: "1",
    slug: "milwaukee-battery-holder",
    name: "Milwaukee Battery Holder",
    category: "Workshop",
    description: "Wall-mounted battery organizer for Milwaukee M18 batteries.",
    price: 24.99,
    images: [
      "/images/products/milwaukee-battery-holder.webp",
    ],
  },

  {
    id: "2",
    slug: "makita-battery-holder",
    name: "Makita Battery Holder",
    category: "Workshop",
    description: "Wall-mounted battery organizer for Makita 18V batteries.",
    price: 24.99,
    images: [
      "/images/products/makita-battery-holder.webp",
    ],
  },

  {
    id: "3",
    slug: "dewalt-battery-holder",
    name: "DeWalt Battery Holder",
    category: "Workshop",
    description: "Heavy-duty battery storage solution for DeWalt batteries.",
    price: 24.99,
    images: [
     "/images/products/dewalt-battery-holder.webp",
    ]
  },

  {
    id: "4",
    slug: "cord-organizer",
    name: "Cord Organizer",
    category: "Workshop",
    description: "Keep extension cords neatly wrapped and easy to access.",
    price: 14.99,
    images: [
     "/images/products/cord-organizer.webp",
    ]
  },

  {
    id: "5",
    slug: "socket-holder",
    name: "Socket Holder",
    category: "Workshop",
    description: "Organize metric and imperial sockets in your toolbox.",
    price: 19.99,
    images: [
     "/images/products/socket-holder.webp",
    ]
  },

  {
    id: "6",
    slug: "drill-bit-organizer",
    name: "Drill Bit Organizer",
    category: "Workshop",
    description: "Compact organizer for drill bits and driver bits.",
    price: 17.99,
    images: [
     "/images/products/drill-bit-organizer.webp",
    ]
  },

  {
    id: "7",
    slug: "desk-cable-clip",
    name: "Desk Cable Clip",
    category: "Office",
    description: "Keep charging cables organized on your desk.",
    price: 9.99,
    images: [
     "/images/products/desk-cable-clip.webp",
    ]
  },

  {
    id: "8",
    slug: "personalized-name-plate",
    name: "Personalized Name Plate",
    category: "Personalized",
    description: "Custom 3D printed desk name plate with your own text.",
    price: 29.99,
    images: [
     "/images/products/personalized-name-plate.webp",
    ]
  },
];