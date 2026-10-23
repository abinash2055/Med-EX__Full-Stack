import express from "express";
import cors from "cors";
import {
  calculateQuote,
  createOrderId,
  validateRequest,
} from "./checkout";
import {
  getState,
  recordOrder,
  saveState,
  transaction,
} from "./store";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/services", (_req, res) => {
  const data = getState();

  res.json(data.services);
});

app.post("/api/quote", (req, res) => {
  try {
    const data = getState();
    const error = validateRequest(data, req.body);

    if (error) {
      return res.status(400).json({ error });
    }

    return res.json(calculateQuote(data, req.body));
  } catch (error) {
    return res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to calculate quote.",
    });
  }
});

app.post("/api/orders", (req, res) => {
  try {
    const initialState = getState();
    const validationError = validateRequest(
      initialState,
      req.body
    );

    if (validationError) {
      return res.status(400).json({
        error: validationError
      });
    }

    // Capture the quote before acquiring the write transaction.
    const previousQuote = calculateQuote(
      initialState,
      req.body
    );

    const result = transaction(() => {
      // Read the latest persisted state after acquiring the lock.
      const data = getState();
      const currentQuote = calculateQuote(data, req.body);

      const previouslyApplied = previousQuote.coupons
        .filter((coupon: any) => coupon.status === "applied")
        .map((coupon: any) => coupon.code);

      const currentlyApplied = new Set(
        currentQuote.coupons
          .filter((coupon: any) => coupon.status === "applied")
          .map((coupon: any) => coupon.code)
      );

      const noLongerAvailable = previouslyApplied.filter(
        (code: string) => !currentlyApplied.has(code)
      );

      if (noLongerAvailable.length > 0) {
        return {
          conflict: true,
          quote: currentQuote,
          unavailableCodes: noLongerAvailable,
        };
      }

      // Persist usage for every applied coupon.
      for (const item of currentQuote.coupons) {
        if (item.status !== "applied") continue;

        const coupon = data.coupons.find(
          (entry: any) => entry.code === item.code
        );

        if (!coupon) continue;

        coupon.usedCount += 1;

        if (req.body.customerId) {
          coupon.usedBy[req.body.customerId] =
            (coupon.usedBy[req.body.customerId] ?? 0) + 1;
        }
      }

      const customer = data.customers.find(
        (entry: any) => entry.id === req.body.customerId
      );

      if (customer) {
        customer.ordersCount += 1;
      }

      const orderId = createOrderId();
      const createdAt = new Date().toISOString();

      data.orders ??= [];
      data.orders.push({
        id: orderId,
        customerId: req.body.customerId ?? null,
        createdAt,
        quote: currentQuote,
      });

      // Both the checkout state and order record are persisted
      // inside the same SQLite transaction.
      saveState(data);

      recordOrder(
        orderId,
        req.body.customerId ?? null,
        createdAt,
        currentQuote.total,
        currentQuote
      );

      return {
        conflict: false,
        orderId,
        quote: currentQuote,
      };
    });

    if (result.conflict) {
      return res.status(409).json({
        error: "The quote has changed. Please confirm the new total.",
        unavailableCodes: result.unavailableCodes,
        quote: result.quote,
      });
    }

    return res.status(201).json({
      message: "Order placed successfully.",
      orderId: result.orderId,
      quote: result.quote,
    });
  } catch (error) {
    return res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to place order.",
    });
  }
});

export default app;