import { afterEach, describe, expect, it, vi } from "vitest";

import { getShippingRates } from "./stallion";

const destination = {
  name: "Jane Doe",
  address1: "123 Main St",
  city: "Vancouver",
  provinceCode: "BC" as const,
  postalCode: "V5K 0A1",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getShippingRates", () => {
  it("keeps the existing flat rate when Stallion is not configured", async () => {
    vi.stubEnv("STALLION_TOKEN", "");

    await expect(getShippingRates(destination, 2)).resolves.toEqual([
      expect.objectContaining({
        service: "layerforge.flat.bc",
        amountCents: 1500,
        source: "fallback",
      }),
    ]);
  });

  it("normalizes and sorts live Stallion rates", async () => {
    vi.stubEnv("STALLION_TOKEN", "test-token");
    vi.stubEnv("STALLION_BASE_URL", "https://sandbox.stallion.ca/api/v5");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              service: "canada_post.expedited",
              carrier: "Canada Post",
              service_name: "Expedited Parcel",
              total: 18.45,
              currency: "CAD",
            },
            {
              service: "intelcom.standard",
              carrier: { name: "Intelcom" },
              service_name: "Standard",
              total: "12.50",
              currency: "CAD",
              delivery_days: 3,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const rates = await getShippingRates(destination, 2);

    expect(rates.map((rate) => rate.service)).toEqual([
      "intelcom.standard",
      "canada_post.expedited",
    ]);
    expect(rates[0]).toEqual(
      expect.objectContaining({
        carrier: "Intelcom",
        amountCents: 1250,
        estimatedDays: 3,
        source: "stallion",
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sandbox.stallion.ca/api/v5/rates",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
