import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createStallionLabel,
  getMultiPackageShippingRates,
  getShippingRates,
} from "./stallion";

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

  it("defaults to the production API when the runtime token is present", async () => {
    vi.stubEnv("STALLION_TOKEN", "runtime-token");
    vi.stubEnv("STALLION_BASE_URL", "");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () =>
        Response.json({
          data: [
            {
              service: "canpar_ground",
              carrier_name: "Canpar",
              service_name: "Ground",
              total: 12.34,
              currency: "CAD",
            },
          ],
        }),
      );

    const rates = await getShippingRates(destination, 1);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://ship.stallion.ca/api/v5/rates",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer runtime-token",
        }),
        method: "POST",
      }),
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual(
      expect.objectContaining({
        type: "regular",
        packages: [
          expect.objectContaining({
            weight: 0.75,
            length: 8,
            width: 6,
            height: 4,
            size_unit: "in",
          }),
        ],
        items: [
          expect.objectContaining({
            quantity: 1,
            value: 0.01,
            currency: "CAD",
            country_of_origin: "CA",
          }),
        ],
      }),
    );
    expect(rates).toEqual([
      expect.objectContaining({
        amountCents: 1234,
        service: "canpar_ground",
        source: "stallion",
      }),
    ]);
  });

  it("sends an estimated standard box to Stallion", async () => {
    vi.stubEnv("STALLION_TOKEN", "runtime-token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        data: [
          {
            service: "intelcom.standard",
            carrier_name: "Intelcom",
            service_name: "Standard",
            total: 7.38,
            currency: "CAD",
          },
        ],
      }),
    );

    await getShippingRates(destination, {
      totalQuantity: 6,
      package: { weight: 1.45, length: 4, width: 2, height: 2 },
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual(
      expect.objectContaining({
        packages: [
          expect.objectContaining({
            weight: 1.45,
            length: 4,
            width: 2,
            height: 2,
          }),
        ],
        items: [expect.objectContaining({ quantity: 6 })],
      }),
    );
  });
});

describe("getMultiPackageShippingRates", () => {
  it("adds the matching service price for every physical package", async () => {
    vi.stubEnv("STALLION_TOKEN", "runtime-token");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () =>
        Response.json({
          data: [
            {
              service: "intelcom.standard",
              carrier_name: "Intelcom",
              service_name: "Standard",
              total: 7.38,
              currency: "CAD",
              delivery_days: 3,
            },
          ],
        }),
      );

    const rates = await getMultiPackageShippingRates(
      destination,
      [
        { weight: 1.45, length: 4, width: 2, height: 2 },
        { weight: 1.45, length: 4, width: 2, height: 2 },
      ],
      12,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(rates).toEqual([
      expect.objectContaining({
        service: "intelcom.standard",
        amountCents: 1476,
        estimatedDays: 3,
      }),
    ]);
  });
});

describe("createStallionLabel", () => {
  it("creates a shipment and purchases the cheapest tracked PDF label", async () => {
    vi.stubEnv("STALLION_TOKEN", "test-token");
    vi.stubEnv("STALLION_BASE_URL", "https://sandbox.stallion.ca/api/v5");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { shipments: [{ id: 12345 }], errors: [] },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
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
                carrier: "Intelcom",
                service_name: "Standard",
                total: 12.5,
                currency: "CAD",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            shipment_id: 12345,
            ship_code: "SHP-12345",
            label_url: "https://labels.example.com/label.pdf",
            tracking_number: "TRACK123",
            rate: {
              service: "intelcom.standard",
              carrier: "Intelcom",
              service_name: "Standard",
              total: 12.5,
              currency: "CAD",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const result = await createStallionLabel({
      destination: {
        ...destination,
        email: "jane@example.com",
      },
      orderReference: "LF000123",
      package: { weight: 1.25, length: 8, width: 6, height: 4 },
      packageContents: "Printed parts",
      service: "cheapest_tracked",
    });

    expect(result).toEqual({
      shipmentId: "12345",
      shipCode: "SHP-12345",
      trackingNumber: "TRACK123",
      labelUrl: "https://labels.example.com/label.pdf",
      carrier: "Intelcom",
      service: "intelcom.standard",
      serviceName: "Standard",
      costCents: 1250,
      currency: "CAD",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://sandbox.stallion.ca/api/v5/shipments",
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://sandbox.stallion.ca/api/v5/rates/12345?timeout=12",
    );
    expect(fetchMock.mock.calls[2][0]).toBe(
      "https://sandbox.stallion.ca/api/v5/labels/12345",
    );

    const shipmentRequest = fetchMock.mock.calls[0][1] as RequestInit;
    const labelRequest = fetchMock.mock.calls[2][1] as RequestInit;
    expect(shipmentRequest.headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer test-token",
        "Idempotency-Key": expect.stringMatching(/^layerforge-shipment-/),
      }),
    );
    expect(JSON.parse(String(shipmentRequest.body))).toEqual(
      expect.objectContaining({
        shipments: [
          expect.objectContaining({
            order_id: "LF000123",
            service: "cheapest_tracked",
          }),
        ],
      }),
    );
    expect(labelRequest.headers).toEqual(
      expect.objectContaining({
        "Idempotency-Key": expect.stringMatching(/^layerforge-label-12345-/),
      }),
    );
    expect(JSON.parse(String(labelRequest.body))).toEqual({
      service: "intelcom.standard",
      label_format: "pdf",
    });
  });

  it("requires a configured Stallion token", async () => {
    vi.stubEnv("STALLION_TOKEN", "");

    await expect(
      createStallionLabel({
        destination,
        orderReference: "LF000123",
        package: { weight: 1, length: 8, width: 6, height: 4 },
        packageContents: "Printed parts",
        service: "cheapest_tracked",
      }),
    ).rejects.toMatchObject({
      message: "Stallion label purchasing is not configured.",
      status: 503,
    });
  });
});
