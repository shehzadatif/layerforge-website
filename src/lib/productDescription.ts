export type ProductDescriptionBlock =
  | {
      type: "heading";
      level: 2 | 3 | 4;
      text: string;
    }
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "unordered-list";
      items: string[];
    }
  | {
      type: "ordered-list";
      items: string[];
    };

const SECTION_HEADINGS = new Set([
  "care instructions",
  "compatibility",
  "compatibility notice",
  "dimensions",
  "features",
  "important information",
  "installation",
  "material",
  "materials",
  "product details",
  "specifications",
  "what is included",
  "what's included",
  "why you will love it",
  "why you'll love it",
]);

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isSameTitle(candidate: string, productName: string): boolean {
  const normalizedCandidate = normalizeTitle(candidate);
  const normalizedProductName = normalizeTitle(productName);

  if (!normalizedCandidate || !normalizedProductName) {
    return false;
  }

  if (normalizedCandidate === normalizedProductName) {
    return true;
  }

  const shorter =
    normalizedCandidate.length < normalizedProductName.length
      ? normalizedCandidate
      : normalizedProductName;
  const longer =
    normalizedCandidate.length < normalizedProductName.length
      ? normalizedProductName
      : normalizedCandidate;

  return shorter.length >= 12 && longer.startsWith(shorter);
}

function isSectionHeading(value: string): boolean {
  const normalized = normalizeTitle(value.replace(/:$/, ""));
  return SECTION_HEADINGS.has(normalized);
}

export function parseProductDescription(
  description: string | null | undefined,
  productName = "",
): ProductDescriptionBlock[] {
  const blocks: ProductDescriptionBlock[] = [];
  const lines = (description ?? "").replace(/\r\n?/g, "\n").split("\n");

  let paragraphLines: string[] = [];
  let listType: "unordered-list" | "ordered-list" | null = null;
  let listItems: string[] = [];
  let hasSeenContent = false;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push({
      type: "paragraph",
      text: paragraphLines.join(" "),
    });
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      return;
    }

    blocks.push({
      type: listType,
      items: listItems,
    });
    listType = null;
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const markdownHeading = line.match(/^(#{1,4})\s+(.+)$/);
    const headingText = markdownHeading?.[2]?.trim();

    if (
      !hasSeenContent &&
      isSameTitle(headingText ?? line.replace(/:$/, ""), productName)
    ) {
      hasSeenContent = true;
      continue;
    }

    hasSeenContent = true;

    if (markdownHeading && headingText) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: Math.min(4, Math.max(2, markdownHeading[1].length)) as
          | 2
          | 3
          | 4,
        text: headingText,
      });
      continue;
    }

    if (isSectionHeading(line)) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: 2,
        text: line.replace(/:$/, ""),
      });
      continue;
    }

    const unorderedItem = line.match(/^(?:[-*•✓])\s+(.+)$/);
    if (unorderedItem) {
      flushParagraph();

      if (listType !== "unordered-list") {
        flushList();
        listType = "unordered-list";
      }

      listItems.push(unorderedItem[1].trim());
      continue;
    }

    const orderedItem = line.match(/^\d+[.)]\s+(.+)$/);
    if (orderedItem) {
      flushParagraph();

      if (listType !== "ordered-list") {
        flushList();
        listType = "ordered-list";
      }

      listItems.push(orderedItem[1].trim());
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}
