import { describe, expect, it } from "vitest";

import {
  answerSiteQuestion,
  findChatTopic,
  getChatTopic,
  normalizeChatQuestion,
  type CatalogueItem,
} from "./chatAssistant";

const catalogue: CatalogueItem[] = [
  {
    category: "drinkware",
    name: "Handled travel mugs",
    detail: "Large insulated mugs with handles and lids.",
    terms: "yeti style mugs rambler ramblers travel cup",
  },
  {
    category: "home-office",
    name: "Mouse pads",
    detail: "Logos, artwork, photos, or gaming designs.",
    terms: "desk mat computer office gaming",
  },
  {
    category: "home-office",
    name: "Fridge magnets",
    detail: "Photos, logos, contact details, or small designs.",
    terms: "refrigerator magnet promotional",
  },
  {
    category: "boxes",
    name: "Gift boxes",
    detail: "Names, logos, messages, or artwork on suitable boxes.",
    terms: "present box packaging",
  },
  {
    category: "boxes",
    name: "Wooden boxes",
    detail: "Print or personalize suitable smooth wooden boxes.",
    terms: "wood keepsake storage box",
  },
  {
    category: "labels",
    name: "Custom decals",
    detail:
      "Logos, artwork, text, or branding for vehicles, products, equipment, windows, and other suitable surfaces.",
    terms:
      "automobile automotive car truck vehicle product equipment window glass door wall floor vinyl sticker storefront branding",
  },
];

describe("chat assistant topic matching", () => {
  it("normalizes punctuation and Canadian English questions", () => {
    expect(normalizeChatQuestion("What’s the PRICE?")).toBe("whats the price");
  });

  it.each([
    ["How much would 25 shirts cost?", "pricing"],
    ["Can I bring my own product?", "supplied"],
    ["Where is my order?", "tracking"],
    ["Do you make employee gifts?", "business"],
    ["I need this by next Friday. What is the turnaround?", "turnaround"],
    ["Can you help prepare my logo?", "artwork"],
    ["Do you offer sublimation printing?", "printing-methods"],
    ["Can you do DTF printing?", "printing-methods"],
    ["Do you make replacement parts?", "specialty"],
  ])("matches %s to %s", (question, expectedTopic) => {
    expect(findChatTopic(question)?.id).toBe(expectedTopic);
  });

  it("prefers the most specific matching phrase", () => {
    expect(findChatTopic("I need bulk pricing for staff apparel")?.id).toBe(
      "pricing",
    );
  });

  it("does not match keywords inside unrelated words", () => {
    expect(findChatTopic("Sometimes I draw things")).toBeNull();
  });

  it("returns null for empty or unknown questions", () => {
    expect(findChatTopic("   ")).toBeNull();
    expect(findChatTopic("Can you recommend a movie?")).toBeNull();
  });

  it("retrieves configured topics by id", () => {
    expect(getChatTopic("products")?.actions?.[0]?.href).toBe(
      "/what-we-make",
    );
    expect(getChatTopic("missing")).toBeNull();
  });

  it("answers a product question from the live catalogue data", () => {
    const response = answerSiteQuestion(
      "Can you customize mouse pads?",
      catalogue,
    );

    expect(response.matchedItem).toBe("Mouse pads");
    expect(response.text).toContain("catalogue includes Mouse pads");
    expect(response.actions?.[0]?.href).toBe(
      "/quote/custom-branding-printing?item=Mouse%20pads",
    );
  });

  it.each(["mousepad", "mouse pad", "mousepads", "mouse pads"])(
    "matches the common mouse pad spelling: %s",
    (question) => {
      expect(answerSiteQuestion(question, catalogue).matchedItem).toBe(
        "Mouse pads",
      );
    },
  );

  it("understands common product wording and small typos", () => {
    expect(
      answerSiteQuestion("Do you make Yeti style mugs?", catalogue).matchedItem,
    ).toBe("Handled travel mugs");
    expect(
      answerSiteQuestion("Can you do frdge magnets?", catalogue).matchedItem,
    ).toBe("Fridge magnets");
  });

  it("summarizes a category using current catalogue items", () => {
    const response = answerSiteQuestion("What boxes can you brand?", catalogue);

    expect(response.text).toContain("Gift boxes");
    expect(response.text).toContain("Wooden boxes");
  });

  it("distinguishes a specific product from its broader category", () => {
    const response = answerSiteQuestion("Do you make gift boxes?", catalogue);

    expect(response.matchedItem).toBe("Gift boxes");
    expect(response.text).toContain("catalogue includes Gift boxes");
  });

  it("prioritizes pricing questions over a mentioned product", () => {
    const response = answerSiteQuestion(
      "Are there extra artwork charges for mouse pads?",
      catalogue,
    );

    expect(response.text).toContain("Any extra work");
    expect(response.matchedItem).toBeUndefined();
  });

  it("explains the available printing methods", () => {
    const response = answerSiteQuestion("What is the difference between DTF and DTG?", catalogue);

    expect(response.text).toContain("DTF and DTG printing for apparel");
    expect(response.actions?.[0]?.href).toContain("#printing-options");
  });

  it.each([
    "Do you make decals?",
    "Can I get a decal for my car?",
    "I need branding decals for a product",
    "Can you make equipment decals?",
  ])("explains that custom decals work on many suitable surfaces: %s", (question) => {
    const response = answerSiteQuestion(question, catalogue);

    expect(response.text).toContain(
      "vehicles, products, equipment, windows, walls, floors",
    );
    expect(response.actions?.[0]?.href).toBe("/what-we-make?search=decals");
    expect(response.actions?.[1]?.href).toContain("item=Custom%20decals");
  });
});
