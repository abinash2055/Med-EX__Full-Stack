
import express from "express";
import cors from "cors";
import { calculateQuote } from "./calculator";
import {
  createOrder,
  db,
  recordCouponUsage,
  seed
} from "./database";
import type { CheckoutRequest } from "./types";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/services", (_req, res) => {
  res.json(seed.services);
});

app.get("/api/customers", (_req, res) => {
  res.json(seed.customers);
});

app.post("/api/quote", (req, res) => {
  try {
    const body = req.body as CheckoutRequest;

    if (!body || !Array.isArray(body.lines)) {
      return res.status(400).json({
        error: "A lines array is required."
      });
    }

    const quote = calculateQuote(seed, body);
    return res.json(quote);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error
        ? error.message
        : "Unable to calculate quote."
    });
  }
});

app.post("/api/orders", (req, res) => {
  const body = req.body as CheckoutRequest;

  if (!body || !Array.isArray(body.lines)) {
    return res.status(400).json({
      error: "A lines array is required."
    });
  }

  try {
    const result = db.transaction(() => {
      const quote = calculateQuote(seed, body);

      const appliedCodes = quote.coupons
        .filter((coupon) => coupon.status === "applied")
        .map((coupon) => coupon.code);

      for (const code of appliedCodes) {
        const coupon = seed.coupons.find(
          (item) => item.code.toUpperCase() === code
        );

        if (!coupon) {
          throw new Error(`Unknown coupon: ${code}`);
        }

        const totalUsed = db.prepare(`
          SELECT COALESCE(SUM(used_count), 0) AS total
          FROM coupon_usage
          WHERE coupon_code = ?
        `).get(code) as { total: number };

        if (
          coupon.usageLimit !== null &&
          coupon.usedCount + totalUsed.total >= coupon.usageLimit
        ) {
          throw new Error(
            `Coupon ${code} has reached its usage limit. Please request a new quote.`
          );
        }
      }

      const order = createOrder(
        body.customerId ?? null,
        body,
        quote
      );

      for (const code of appliedCodes) {
        recordCouponUsage(code, body.customerId ?? null);
      }

      return {
        orderId: Number(order.lastInsertRowid),
        quote
      };
    })();

    return res.status(201).json({
      message: "Order created successfully.",
      ...result
    });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error
        ? error.message
        : "Unable to create order."
    });
  }
});

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`MedEx checkout API running at http://localhost:${port}`);
});
