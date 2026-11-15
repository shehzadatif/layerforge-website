import { describe, expect, it } from "vitest";

import {
  findChatTopic,
  getChatTopic,
  normalizeChatQuestion,
} from "./chatAssistant";

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
      "/custom-branding-printing",
    );
    expect(getChatTopic("missing")).toBeNull();
  });
});
