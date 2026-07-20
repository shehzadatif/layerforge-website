import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
} from "pdf-lib";
import { formatPacificDate } from "./dateUtils";

type QuoteRecord = {
  quote_number?: string | number | null;
  created_at: string;
  customer_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  project_name?: string | null;
  service?: string | null;
  material?: string | null;
  quantity?: number | string | null;
  quoted_price?: number | string | null;
  estimated_price?: number | string | null;
  description?: string | null;
  internal_notes?: string | null;
  project_details?: Record<string, unknown> | null;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT_MARGIN = 50;
const RIGHT_MARGIN = 50;

function getSiteUrl(): string {
  const siteUrl = import.meta.env.PUBLIC_SITE_URL
    ?.trim()
    .replace(/\/+$/, "");

  if (!siteUrl) {
    throw new Error(
      "PUBLIC_SITE_URL environment variable is required.",
    );
  }

  return siteUrl;
}

async function embedLogo(
  pdf: PDFDocument,
  siteUrl: string,
) {
  try {
    const logoResponse = await fetch(
      `${siteUrl}/images/pdf/logo.png`,
    );

    if (!logoResponse.ok) {
      throw new Error(
        `Logo request returned ${logoResponse.status}.`,
      );
    }

    const logoBytes =
      await logoResponse.arrayBuffer();

    return await pdf.embedPng(logoBytes);
  } catch (error) {
    console.error("Unable to load quote PDF logo.", {
      error,
    });

    return null;
  }
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)} CAD`;
}

function truncateText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) {
    return text;
  }

  let shortened = text;

  while (
    shortened.length > 0 &&
    font.widthOfTextAtSize(
      `${shortened}...`,
      size,
    ) > maxWidth
  ) {
    shortened = shortened.slice(0, -1);
  }

  return `${shortened}...`;
}

export async function generateQuotePdf(
  quote: QuoteRecord,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([
    PAGE_WIDTH,
    PAGE_HEIGHT,
  ]);

  const regular = await pdf.embedFont(
    StandardFonts.Helvetica,
  );

  const bold = await pdf.embedFont(
    StandardFonts.HelveticaBold,
  );

  const siteUrl = getSiteUrl();
  const logo = await embedLogo(pdf, siteUrl);

  const quoteNumber = quote.quote_number
    ? String(quote.quote_number)
    : "Quote";

  const quantity = Math.max(
    1,
    Number(quote.quantity ?? 1),
  );

  const quotedPrice = Number(
    quote.quoted_price ??
      quote.estimated_price ??
      0,
  );

  const projectDetails =
    quote.project_details &&
    typeof quote.project_details === "object"
      ? quote.project_details
      : {};

  const suppliedUnitPrice =
    projectDetails.unit_price;

  const unitPrice =
    typeof suppliedUnitPrice === "number"
      ? suppliedUnitPrice
      : quantity > 0
        ? quotedPrice / quantity
        : quotedPrice;

  let y = 742;

  const drawText = (
    text: string,
    x: number,
    size = 11,
    font: PDFFont = regular,
  ) => {
    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(0.06, 0.09, 0.16),
    });
  };

  if (logo) {
    const logoWidth = 150;
    const logoHeight =
      logo.height * (logoWidth / logo.width);

    page.drawImage(logo, {
      x: LEFT_MARGIN,
      y: y - logoHeight + 14,
      width: logoWidth,
      height: logoHeight,
    });
  } else {
    drawText("Layer Forge", LEFT_MARGIN, 24, bold);
  }

  page.drawText("QUOTE", {
    x: 470,
    y,
    size: 18,
    font: bold,
    color: rgb(0.06, 0.09, 0.16),
  });

y -= 34;

drawText(`Quote: ${quoteNumber}`, 420, 10);

  y -= 20;

  drawText(
    `Date: ${formatPacificDate(quote.created_at)}`,
    420,
    10,
  );

  y -= 52;

  drawText("Prepared For", LEFT_MARGIN, 14, bold);

  y -= 22;

  drawText(
    quote.customer_name ??
      quote.name ??
      "Customer",
    LEFT_MARGIN,
  );

  if (quote.email) {
    y -= 16;
    drawText(quote.email, LEFT_MARGIN);
  }

  if (quote.phone) {
    y -= 16;
    drawText(quote.phone, LEFT_MARGIN);
  }

  y -= 46;

  page.drawRectangle({
    x: LEFT_MARGIN,
    y: y - 5,
    width:
      PAGE_WIDTH -
      LEFT_MARGIN -
      RIGHT_MARGIN,
    height: 24,
    color: rgb(0.94, 0.95, 0.97),
  });

  drawText("Project", 60, 10, bold);
  drawText("Material", 280, 10, bold);
  drawText("Qty", 390, 10, bold);
  drawText("Unit Price", 430, 10, bold);
  drawText("Total", 515, 10, bold);

  y -= 32;

  const projectName =
    quote.project_name ||
    quote.service ||
    "Custom Quote";

  drawText(
    truncateText(
      projectName,
      regular,
      10,
      205,
    ),
    60,
    10,
  );

  drawText(
    truncateText(
      quote.material || "-",
      regular,
      10,
      95,
    ),
    280,
    10,
  );

  drawText(String(quantity), 390, 10);

  drawText(
    `$${Number(unitPrice).toFixed(2)}`,
    430,
    10,
  );

  drawText(
    `$${quotedPrice.toFixed(2)}`,
    515,
    10,
  );

  y -= 48;

  page.drawLine({
    start: {
      x: 390,
      y: y + 15,
    },
    end: {
      x: 562,
      y: y + 15,
    },
    thickness: 1,
    color: rgb(0.82, 0.84, 0.88),
  });

  drawText("Quote Total", 390, 14, bold);
  drawText(
    formatCurrency(quotedPrice),
    475,
    14,
    bold,
  );

  const notes =
    quote.description ||
    quote.internal_notes;

  if (notes) {
    y -= 60;

    drawText("Project Notes", LEFT_MARGIN, 13, bold);

    y -= 22;

    const normalizedNotes = String(notes)
      .replace(/\s+/g, " ")
      .trim();

    drawText(
      truncateText(
        normalizedNotes,
        regular,
        10,
        500,
      ),
      LEFT_MARGIN,
      10,
    );
  }

 y -= 70;

const noticeBoxY = y - 20;
const noticeBoxHeight = 56;

page.drawRectangle({
  x: LEFT_MARGIN,
  y: noticeBoxY,
  width:
    PAGE_WIDTH -
    LEFT_MARGIN -
    RIGHT_MARGIN,
  height: noticeBoxHeight,
  color: rgb(1, 0.98, 0.82),
  borderColor: rgb(0.92, 0.7, 0.03),
  borderWidth: 1,
});

page.drawText(
  "Taxes and shipping charges, where applicable,",
  {
    x: LEFT_MARGIN + 22,
    y: noticeBoxY + 32,
    size: 10,
    font: bold,
    color: rgb(0.06, 0.09, 0.16),
  },
);

page.drawText(
  "will be calculated during secure checkout.",
  {
    x: LEFT_MARGIN + 22,
    y: noticeBoxY + 15,
    size: 10,
    font: bold,
    color: rgb(0.06, 0.09, 0.16),
  },
);

y = noticeBoxY - 68;

  y -= 26;

  page.drawLine({
    start: {
      x: LEFT_MARGIN,
      y,
    },
    end: {
      x: PAGE_WIDTH - RIGHT_MARGIN,
      y,
    },
    thickness: 1,
    color: rgb(0.88, 0.89, 0.91),
  });

  y -= 18;

  drawText(
    `Layer Forge · ${siteUrl.replace(
      /^https?:\/\//,
      "",
    )}`,
    LEFT_MARGIN,
    9,
  );

  return pdf.save();
}
