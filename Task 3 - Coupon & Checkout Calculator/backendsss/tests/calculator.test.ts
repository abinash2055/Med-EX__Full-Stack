
import { describe, expect, it } from "vitest";
import { calculateQuote } from "../src/calculator";
import type { CheckoutData } from "../src/types";
import fs from "node:fs";
import path from "node:path";

const dataPath = path.resolve(
  process.cwd(),
  "data/checkout.json"
);

const data = JSON.parse(
  fs.readFileSync(dataPath, "utf8")
) as CheckoutData;

const testDate = "2026-10-22T12:00:00+07:00";

describe("Checkout calculator", () => {
  it("calculates a quote for a valid service", () => {
    const service = data.services[0];

    const quote = calculateQuote(data, {
      lines: [
        {
          serviceId: service.id,
          quantity: 1
        }
      ],
      couponCodes: [],
      customerId: null,
      at: testDate
    });

    expect(quote.subtotal).toBe(service.price);
    expect(quote.discountTotal).toBe("0.00");
    expect(quote.total).toBeDefined();
    expect(Number(quote.total)).toBeGreaterThan(0);
  });

  it("calculates quantity correctly", () => {
    const service = data.services[0];

    const quote = calculateQuote(data, {
      lines: [
        {
          serviceId: service.id,
          quantity: 2
        }
      ],
      couponCodes: [],
      customerId: null,
      at: testDate
    });

    const expectedSubtotal = (
      Number(service.price) * 2
    ).toFixed(2);

    expect(quote.subtotal).toBe(expectedSubtotal);
  });

  it("rejects an unknown service", () => {
    expect(() =>
      calculateQuote(data, {
        lines: [
          {
            serviceId: "UNKNOWN_SERVICE",
            quantity: 1
          }
        ],
        couponCodes: [],
        customerId: null,
        at: testDate
      })
    ).toThrow("Unknown serviceId");
  });

  it("rejects invalid quantities", () => {
    const service = data.services[0];

    expect(() =>
      calculateQuote(data, {
        lines: [
          {
            serviceId: service.id,
            quantity: 0
          }
        ],
        couponCodes: [],
        customerId: null,
        at: testDate
      })
    ).toThrow("Quantity must be a whole number");
  });

  it("rejects an unknown coupon without crashing", () => {
    const service = data.services[0];

    const quote = calculateQuote(data, {
      lines: [
        {
          serviceId: service.id,
          quantity: 1
        }
      ],
      couponCodes: ["NOTAREALCODE"],
      customerId: null,
      at: testDate
    });

    expect(quote.coupons[0].status).toBe("rejected");
  });
});
