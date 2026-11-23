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

export interface CatalogueItem {
  category: string;
  name: string;
  detail: string;
  terms: string;
}

export interface ChatResponse {
  text: string;
  actions?: ChatAction[];
  matchedItem?: string;
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
      "Our searchable list includes more than 140 options across drinkware, clothing and bags, home and office items, boxes and packaging, signs, labels, gifts, business packages, and custom projects. Search the list by the item you have in mind, then open a quote with that item already selected.",
    actions: [
      { label: "Search what we customize", href: "/what-we-make" },
      { label: "Browse the shop", href: "/shop" },
    ],
  },
  {
    id: "decals",
    title: "Custom decals",
    summary: "Vehicles, products, equipment & more",
    keywords: [
      "decal",
      "decals",
      "custom decal",
      "custom decals",
      "vehicle decal",
      "vehicle decals",
      "car decal",
      "car decals",
      "automobile decal",
      "automobile decals",
      "product decal",
      "product decals",
      "equipment decal",
      "equipment decals",
      "window decal",
      "window decals",
      "wall decal",
      "wall decals",
      "floor decal",
      "floor decals",
      "vinyl decal",
      "vinyl decals",
    ],
    answer:
      "Yes—we make custom decals for vehicles, products, equipment, windows, walls, floors, storefronts, and other suitable surfaces. Share the surface, approximate size, quantity, artwork, and whether the decal will be used indoors or outdoors so we can recommend the right option.",
    actions: [
      { label: "Browse custom decals", href: "/what-we-make?search=decals" },
      {
        label: "Get a decal quote",
        href: "/quote/custom-branding-printing?item=Custom%20decals",
      },
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
      "extra charge",
      "extra charges",
      "artwork correction",
      "artwork charge",
      "artwork charges",
      "artwork fee",
      "extra artwork",
      "image correction",
      "design fee",
      "setup fee",
      "rush fee",
    ],
    answer:
      "A custom quote considers the product, quantity, customization area, artwork readiness, finish, and deadline. Any extra work—such as image cleanup, artwork changes, special setup, individual names, or rush service—is identified separately before you approve the order. Quantity pricing is based on the final item and design.",
    actions: [
      {
        label: "Start a branding project",
        href: "/quote/custom-branding-printing",
      },
      { label: "Search products first", href: "/what-we-make" },
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
    id: "printing-methods",
    title: "Printing options",
    summary: "UV, sublimation, inkjet, DTF & DTG",
    keywords: [
      "printing options",
      "printing methods",
      "uv printing",
      "sublimation",
      "sublimation printing",
      "inkjet",
      "inkjet printing",
      "dtf",
      "dtf printing",
      "direct to film",
      "dtg",
      "dtg printing",
      "direct to garment",
    ],
    answer:
      "We offer UV printing for suitable products, sublimation for mugs and other specially coated items, inkjet printing for stickers, labels, decals and paper pieces, plus DTF and DTG printing for apparel. Tell us the product, artwork, quantity, and finish you want and we’ll recommend the best option.",
    actions: [
      { label: "Compare printing options", href: "/custom-branding-printing#printing-options" },
      { label: "View apparel printing", href: "/custom-apparel#printing-methods" },
    ],
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
      { label: "Plan your branding", href: "/quote/custom-branding-printing" },
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
      { label: "Request a quote", href: "/quote" },
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
      { label: "View business packages", href: "/custom-branding-printing#packages" },
      {
        label: "Plan a branding package",
        href: "/quote/custom-branding-printing?project=branding-package",
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
        href: "/custom-apparel",
      },
    ],
  },
  {
    id: "specialty",
    title: "Additional custom projects",
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
      "We also review one-off items, functional products, prototypes, replacement parts, holders, mounts, organizers, and other unusual projects. Show us the item or describe the result you need, and we’ll confirm whether it is a practical fit.",
    actions: [
      { label: "View additional projects", href: "/additional-custom-projects" },
      { label: "Describe your project", href: "/quote" },
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
  "decals",
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

const QUESTION_WORDS = new Set([
  "a",
  "about",
  "and",
  "are",
  "brand",
  "branding",
  "can",
  "could",
  "custom",
  "customize",
  "customized",
  "do",
  "for",
  "have",
  "i",
  "is",
  "it",
  "make",
  "me",
  "my",
  "on",
  "personalize",
  "print",
  "the",
  "this",
  "to",
  "what",
  "with",
  "you",
]);

const CATEGORY_DETAILS: Record<
  string,
  { label: string; queryWords: string[] }
> = {
  drinkware: {
    label: "cups and drinkware",
    queryWords: ["drinkware", "bottles", "cups"],
  },
  apparel: {
    label: "clothing and bags",
    queryWords: ["apparel", "clothing", "clothes", "bags"],
  },
  "home-office": {
    label: "home and office items",
    queryWords: ["home office", "office items", "desk items"],
  },
  boxes: {
    label: "boxes and packaging",
    queryWords: ["boxes", "packaging"],
  },
  signs: {
    label: "signs and displays",
    queryWords: ["signs", "displays"],
  },
  labels: {
    label: "stickers, labels, and decals",
    queryWords: ["stickers", "labels", "decals"],
  },
  gifts: {
    label: "gifts and small items",
    queryWords: ["gift ideas", "small gifts", "keepsakes"],
  },
  packages: {
    label: "business and event packages",
    queryWords: ["business packages", "event packages", "branding packages"],
  },
  custom: {
    label: "additional custom projects",
    queryWords: ["custom projects", "unusual projects", "one off projects"],
  },
};

function questionTokens(value: string): string[] {
  return normalizeChatQuestion(value)
    .split(" ")
    .filter((token) => token.length > 1 && !QUESTION_WORDS.has(token));
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex];
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + cost,
      );
      diagonal = above;
    }
  }

  return previous[right.length];
}

function tokensMatch(questionToken: string, contentToken: string): boolean {
  if (questionToken === contentToken) return true;
  if (
    questionToken.length > 2 &&
    (questionToken === `${contentToken}s` || contentToken === `${questionToken}s`)
  ) {
    return true;
  }

  return (
    questionToken.length >= 5 &&
    contentToken.length >= 5 &&
    editDistance(questionToken, contentToken) <= 1
  );
}

function categoryFromQuestion(question: string, itemTokens: string[]): string | null {
  const normalizedQuestion = normalizeChatQuestion(question);

  for (const [category, details] of Object.entries(CATEGORY_DETAILS)) {
    const hasSpecificMultiwordCategory = details.queryWords.some((word) => {
      const normalizedWord = normalizeChatQuestion(word);
      return (
        normalizedWord.includes(" ") &&
        ` ${normalizedQuestion} `.includes(` ${normalizedWord} `)
      );
    });

    if (itemTokens.length !== 1 && !hasSpecificMultiwordCategory) continue;

    if (
      details.queryWords.some((word) =>
        ` ${normalizedQuestion} `.includes(` ${normalizeChatQuestion(word)} `),
      )
    ) {
      return category;
    }
  }

  return null;
}

function itemScore(question: string, item: CatalogueItem): number {
  const normalizedQuestion = normalizeChatQuestion(question);
  const normalizedName = normalizeChatQuestion(item.name);
  const searchable = normalizeChatQuestion(
    `${item.name} ${item.detail} ${item.terms}`,
  );
  const itemTokens = questionTokens(question);
  const nameTokens = normalizedName.split(" ");
  const compactName = nameTokens.join("");
  const searchableTokens = searchable.split(" ");
  let score = 0;

  if (` ${normalizedQuestion} `.includes(` ${normalizedName} `)) score += 120;
  if (itemTokens.some((token) => tokensMatch(token, compactName))) score += 90;

  for (const token of itemTokens) {
    if (nameTokens.some((candidate) => tokensMatch(token, candidate))) {
      score += 18;
    } else if (
      searchableTokens.some((candidate) => tokensMatch(token, candidate))
    ) {
      score += 7;
    }
  }

  for (let length = Math.min(3, itemTokens.length); length >= 2; length -= 1) {
    for (let index = 0; index <= itemTokens.length - length; index += 1) {
      const phrase = itemTokens.slice(index, index + length).join(" ");
      if (` ${searchable} `.includes(` ${phrase} `)) score += length * 18;
    }
  }

  return score;
}

function quoteAction(itemName: string): ChatAction {
  return {
    label: `Get a quote for ${itemName}`,
    href: `/quote/custom-branding-printing?item=${encodeURIComponent(itemName)}`,
  };
}

export function answerSiteQuestion(
  question: string,
  catalogueItems: readonly CatalogueItem[] = [],
): ChatResponse {
  const normalizedQuestion = normalizeChatQuestion(question);

  if (!normalizedQuestion) {
    return {
      text: "Ask me about a product, pricing, artwork, quantity, timing, shipping, or an existing order.",
    };
  }

  const directTopic = findChatTopic(question);

  if (directTopic?.id === "decals") {
    return { text: directTopic.answer, actions: directTopic.actions };
  }

  const itemTokens = questionTokens(question);
  const category = categoryFromQuestion(question, itemTokens);

  if (category) {
    const matches = catalogueItems.filter((item) => item.category === category);
    const details = CATEGORY_DETAILS[category];

    if (matches.length && details) {
      const examples = matches
        .slice(0, 7)
        .map((item) => item.name)
        .join(", ");

      return {
        text: `For ${details.label}, our current list includes ${examples}${matches.length > 7 ? ", and more" : ""}. Search the full list to compare the available ideas, then choose an item to open a quote with it already selected.`,
        actions: [{ label: "Search all items", href: "/what-we-make" }],
      };
    }
  }

  if (
    directTopic &&
    [
      "artwork",
      "business",
      "contact",
      "minimum",
      "policies",
      "pricing",
      "printing-methods",
      "process",
      "shipping",
      "supplied",
      "tracking",
      "turnaround",
    ].includes(directTopic.id)
  ) {
    return { text: directTopic.answer, actions: directTopic.actions };
  }

  const rankedItems = catalogueItems
    .map((item) => ({ item, score: itemScore(question, item) }))
    .filter(({ score }) => score >= 18)
    .sort((left, right) => right.score - left.score);
  const bestMatch = rankedItems[0];

  if (bestMatch) {
    const closeMatches = rankedItems
      .filter(({ score }) => score >= bestMatch.score - 8)
      .slice(0, 3);

    if (closeMatches.length === 1 || bestMatch.score >= 100) {
      const { item } = bestMatch;
      return {
        text: `Yes—our catalogue includes ${item.name}. ${item.detail} Choose it from the catalogue and it will already be selected when the quote form opens.`,
        actions: [
          quoteAction(item.name),
          { label: "Browse similar items", href: "/what-we-make" },
        ],
        matchedItem: item.name,
      };
    }

    const options = closeMatches
      .map(({ item }) => `${item.name}: ${item.detail}`)
      .join(" ");

    return {
      text: `I found a few relevant options. ${options}`,
      actions: [
        quoteAction(bestMatch.item.name),
        { label: "Search all items", href: "/what-we-make" },
      ],
      matchedItem: bestMatch.item.name,
    };
  }

  if (directTopic) {
    return { text: directTopic.answer, actions: directTopic.actions };
  }

  return {
    text: "I couldn’t find that exact item in our current list. Tell us what the item is made from, its approximate size, the quantity, and what you want added to it. We can check it as an additional custom project.",
    actions: [
      { label: "Search what we customize", href: "/what-we-make" },
      { label: "Ask about a custom item", href: "/quote/custom-branding-printing" },
    ],
  };
}
