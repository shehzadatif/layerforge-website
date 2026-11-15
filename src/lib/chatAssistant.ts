export interface ChatAction {
  label: string;
  href: string;
}

export interface ChatTopic {
  id: string;
  title: string;
  summary?: string;
  keywords: string[];
  answer: string;
  actions?: ChatAction[];
}

export const CHAT_TOPICS: ChatTopic[] = [
  {
    id: "greeting",
    title: "Hello",
    keywords: ["hi", "hello", "hey", "good morning", "good afternoon"],
    answer:
      "Hi! I can help you explore products, plan a branding project, find quote information, or track an order. Choose a topic or ask a question below.",
  },
  {
    id: "products",
    title: "What can you brand?",
    summary: "Apparel, drinkware, gifts, labels & more",
    keywords: [
      "what can you brand",
      "what do you make",
      "what do you offer",
      "products",
      "product options",
      "catalogue",
      "merchandise",
      "promotional products",
      "gifts",
      "drinkware",
    ],
    answer:
      "We create branded apparel and workwear, drinkware, personalized gifts, labels, stickers, promotional pieces, and coordinated branding packages. We also make engraved products and functional 3D-printed items.",
    actions: [
      { label: "Open the Branding Studio", href: "/branding-studio" },
      { label: "Explore branding options", href: "/custom-branding-printing" },
    ],
  },
  {
    id: "pricing",
    title: "Pricing & quotes",
    summary: "How custom project pricing works",
    keywords: [
      "price",
      "prices",
      "pricing",
      "cost",
      "how much",
      "quote",
      "estimate",
      "bulk pricing",
      "quantity pricing",
      "discount",
      "budget",
    ],
    answer:
      "Shop products show their available pricing online. Custom branding, engraving, and made-to-order projects are priced after we review the product, artwork, quantity, finish, and deadline. Tell us what you need and we’ll prepare the right next step.",
    actions: [
      {
        label: "Start a branding project",
        href: "/quote/custom-branding-printing",
      },
      { label: "Choose another quote", href: "/quote" },
    ],
  },
  {
    id: "turnaround",
    title: "Turnaround time",
    summary: "Planning around your deadline",
    keywords: [
      "turnaround",
      "how long",
      "deadline",
      "need it by",
      "when will it be ready",
      "production time",
      "rush",
      "urgent",
      "asap",
      "ready date",
    ],
    answer:
      "Timing depends on the product, quantity, artwork readiness, and current production schedule. Include your required date with your request and we’ll confirm whether the project can be completed in time before you approve it.",
    actions: [{ label: "Tell us your deadline", href: "/quote" }],
  },
  {
    id: "minimum",
    title: "Order quantities",
    summary: "Single items, small batches & repeat orders",
    keywords: [
      "minimum order",
      "minimum quantity",
      "small order",
      "just one",
      "single item",
      "one shirt",
      "few shirts",
      "quantity",
      "moq",
    ],
    answer:
      "Many projects can begin with a single personalized item or a small batch, while other products have practical minimums. Share the item and quantity you have in mind and we’ll confirm the available options and pricing.",
    actions: [{ label: "Discuss your quantity", href: "/contact" }],
  },
  {
    id: "shipping",
    title: "Shipping & pickup",
    summary: "Surrey pickup and shipping options",
    keywords: [
      "shipping",
      "ship",
      "pickup",
      "pick up",
      "delivery",
      "courier",
      "surrey pickup",
      "ship across canada",
      "canada wide",
    ],
    answer:
      "Orders can be collected by appointment in Surrey, BC, and shipping is available within Canada. Available delivery choices and costs are confirmed with the order or shown during online checkout.",
    actions: [{ label: "Shipping & pickup policy", href: "/terms#shipping" }],
  },
  {
    id: "artwork",
    title: "Artwork & design help",
    summary: "Logos, files, placement & personalization",
    keywords: [
      "artwork",
      "design help",
      "logo",
      "file type",
      "file format",
      "mockup",
      "proof",
      "placement",
      "personalization",
      "names",
      "prepare my design",
    ],
    answer:
      "You can upload a logo, finished artwork, or a visual reference with your request. We’ll review quality, placement, sizing, colours, and any names or variable details before confirming the project.",
    actions: [
      { label: "Preview your branding", href: "/branding-studio" },
    ],
  },
  {
    id: "process",
    title: "How it works",
    summary: "From idea to finished order",
    keywords: [
      "how does it work",
      "how do i order",
      "how to order",
      "get started",
      "start a project",
      "order process",
      "place an order",
    ],
    answer:
      "Start by choosing a shop product or sharing your project details. We review the product, artwork, quantity, and timing, then confirm the plan and pricing. Production begins after the details are approved.",
    actions: [
      { label: "Browse what we make", href: "/what-we-make" },
      { label: "Build a project", href: "/branding-studio" },
    ],
  },
  {
    id: "business",
    title: "Business branding",
    summary: "Teams, gifts, events & coordinated packages",
    keywords: [
      "business branding",
      "corporate branding",
      "company logo",
      "employee gifts",
      "client gifts",
      "staff apparel",
      "uniforms",
      "team apparel",
      "event branding",
      "branding package",
    ],
    answer:
      "We can coordinate apparel, employee items, client gifts, labels, giveaways, and event products around one brand. Share your audience, approximate quantity, budget range, and deadline so we can shape a practical package.",
    actions: [
      { label: "View business branding", href: "/for-businesses" },
      {
        label: "Build a branding package",
        href: "/branding-studio?goal=client-gifts",
      },
    ],
  },
  {
    id: "supplied",
    title: "Customer-supplied items",
    summary: "Ask about an item you already have",
    keywords: [
      "customer supplied",
      "supply my own",
      "bring my own",
      "already have the item",
      "my own shirt",
      "my own product",
      "can you print on this",
      "unusual item",
      "one off project",
    ],
    answer:
      "Selected customer-supplied items can be reviewed before we accept the project. We’ll need to confirm the material, surface, size, condition, quantity, and intended result. Please do not drop off an item until compatibility is confirmed.",
    actions: [
      { label: "Describe your item", href: "/quote/custom-branding-printing" },
      {
        label: "Additional custom projects",
        href: "/additional-custom-projects",
      },
    ],
  },
  {
    id: "apparel",
    title: "Custom apparel",
    keywords: [
      "t shirt",
      "t-shirt",
      "shirt",
      "hoodie",
      "sweatshirt",
      "polo",
      "workwear",
      "uniform",
      "apparel",
      "clothing",
    ],
    answer:
      "You can create custom T-shirts and hoodies online, or discuss coordinated apparel for staff, teams, events, and promotions. Available garments, colours, sizes, placements, and quantities depend on the selected product.",
    actions: [
      { label: "Design apparel online", href: "/custom-apparel" },
      {
        label: "Discuss team apparel",
        href: "/for-businesses#corporate-apparel",
      },
    ],
  },
  {
    id: "specialty",
    title: "Engraving & 3D printing",
    keywords: [
      "laser engraving",
      "engraving",
      "engrave",
      "3d printing",
      "3d printed",
      "prototype",
      "replacement part",
      "replacement parts",
      "functional part",
    ],
    answer:
      "Layer Forge also offers laser engraving for suitable products and materials, plus 3D printing for functional products, prototypes, replacement parts, and custom solutions.",
    actions: [
      { label: "Laser engraving", href: "/laser-engraving" },
      { label: "3D printing", href: "/3d-printing" },
    ],
  },
  {
    id: "tracking",
    title: "Track my order",
    summary: "Check an existing Layer Forge order",
    keywords: [
      "track my order",
      "track order",
      "tracking",
      "order status",
      "where is my order",
      "existing order",
      "order update",
      "order number",
    ],
    answer:
      "Use the order tracker with your Layer Forge order number and the email used for the order. If the details do not match or you need more help, contact us and include the order number.",
    actions: [
      { label: "Track an order", href: "/track" },
      { label: "Contact support", href: "/contact" },
    ],
  },
  {
    id: "policies",
    title: "Changes, returns & cancellations",
    keywords: [
      "refund",
      "return",
      "exchange",
      "cancel",
      "cancellation",
      "change my order",
      "damaged",
      "problem with order",
      "wrong item",
    ],
    answer:
      "Because products are customized, changes, cancellations, returns, and remedies depend on the order stage and the issue. Review the terms for full details, or contact support promptly with your order number.",
    actions: [
      { label: "Terms & policies", href: "/terms" },
      { label: "Contact support", href: "/contact" },
    ],
  },
  {
    id: "contact",
    title: "Contact Layer Forge",
    keywords: [
      "contact",
      "email",
      "phone",
      "call",
      "talk to a person",
      "speak to someone",
      "human",
      "representative",
      "where are you",
      "location",
      "hours",
    ],
    answer:
      "Layer Forge Canada is based in Surrey, British Columbia. You can send a project question through the contact page or email support@layerforgecanada.com. Business hours are Monday to Friday, 9:00 AM to 6:00 PM.",
    actions: [
      { label: "Contact us", href: "/contact" },
      {
        label: "Email support",
        href: "mailto:support@layerforgecanada.com",
      },
    ],
  },
];

export const CHAT_HOME_TOPIC_IDS = [
  "products",
  "pricing",
  "turnaround",
  "artwork",
  "shipping",
  "tracking",
] as const;

export const CHAT_MORE_TOPIC_IDS = [
  "minimum",
  "process",
  "business",
  "supplied",
] as const;

export function normalizeChatQuestion(value: string): string {
  return value
    .toLocaleLowerCase("en-CA")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function includesKeyword(question: string, keyword: string): boolean {
  const normalizedKeyword = normalizeChatQuestion(keyword);

  if (!normalizedKeyword) return false;

  return ` ${question} `.includes(` ${normalizedKeyword} `);
}

export function findChatTopic(question: string): ChatTopic | null {
  const normalizedQuestion = normalizeChatQuestion(question);

  if (!normalizedQuestion) return null;

  let bestTopic: ChatTopic | null = null;
  let bestScore = 0;

  for (const topic of CHAT_TOPICS) {
    for (const keyword of topic.keywords) {
      if (!includesKeyword(normalizedQuestion, keyword)) continue;

      const score = normalizeChatQuestion(keyword).split(" ").length;

      if (score > bestScore) {
        bestTopic = topic;
        bestScore = score;
      }
    }
  }

  return bestTopic;
}

export function getChatTopic(id: string): ChatTopic | null {
  return CHAT_TOPICS.find((topic) => topic.id === id) ?? null;
}
