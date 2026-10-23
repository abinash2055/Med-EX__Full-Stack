
import {
  money,
  percentDiscount,
  roundHalfUp,
  toSatang
} from "./money";
import type {
  CheckoutData,
  CheckoutRequest,
  Coupon
} from "./types";

export function calculateQuote(
  data: CheckoutData,
  request: CheckoutRequest
) {
  const now = request.at
    ? new Date(request.at)
    : new Date();

  if (Number.isNaN(now.getTime())) {
    throw new Error("Invalid date supplied");
  }

  const bangkokDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);

  const lines = request.lines.map((input) => {
    const service = data.services.find(
      (item) => item.id === input.serviceId
    );

    if (!service) {
      throw new Error(`Unknown serviceId: ${input.serviceId}`);
    }

    if (
      !Number.isInteger(input.quantity) ||
      input.quantity < 1 ||
      input.quantity > 20
    ) {
      throw new Error("Quantity must be a whole number from 1 to 20.");
    }

    return {
      serviceId: service.id,
      quantity: input.quantity,
      amount: toSatang(service.price) * input.quantity,
      discounts: {} as Record<string, string>,
      remaining: toSatang(service.price) * input.quantity,
      service
    };
  });

  const subtotal = lines.reduce(
    (sum, line) => sum + line.amount,
    0
  );

  const coupons = request.couponCodes.map((input) => ({
    code: input.trim().toUpperCase(),
    original: input.trim().toUpperCase()
  }));

  const results: {
    code: string;
    status: "applied" | "rejected";
    discount?: string;
    reason?: string;
  }[] = [];

  const seen = new Set<string>();

  for (let i = 0; i < coupons.length; i++) {
    const code = coupons[i].code;

    if (seen.has(code)) {
      results.push({
        code,
        status: "rejected",
        reason: "This code is already applied."
      });
    } else {
      seen.add(code);
      results.push({
        code,
        status: "rejected",
        reason: "Not evaluated."
      });
    }
  }

  const evaluationOrder = results
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => result.reason === "Not evaluated.")
    .sort((a, b) => {
      const couponA = data.coupons.find(
        (c) => c.code.toUpperCase() === a.result.code
      );
      const couponB = data.coupons.find(
        (c) => c.code.toUpperCase() === b.result.code
      );

      return Number(couponA?.stackable ?? true) -
        Number(couponB?.stackable ?? true) ||
        a.index - b.index;
    });

  let appliedNonStackable: string | null = null;

  for (const { result } of evaluationOrder) {
    const coupon: Coupon | undefined = data.coupons.find(
      (item) => item.code.toUpperCase() === result.code
    );

    const reject = (reason: string) => {
      result.status = "rejected";
      result.reason = reason;
      delete result.discount;
    };

    if (!coupon) {
      reject("We don't recognise this code.");
      continue;
    }

    if (coupon.status !== "active") {
      reject("This code is no longer active.");
      continue;
    }

    if (bangkokDate < coupon.startsOn) {
      reject(`This code starts on ${coupon.startsOn}.`);
      continue;
    }

    if (bangkokDate > coupon.endsOn) {
      reject(`This code expired on ${coupon.endsOn}.`);
      continue;
    }

    if (
      coupon.usageLimit !== null &&
      coupon.usedCount >= coupon.usageLimit
    ) {
      reject("This code has been fully used.");
      continue;
    }

    const customer = request.customerId
      ? data.customers.find(
          (item) => item.id === request.customerId
        )
      : undefined;

    if (
      (coupon.perCustomerLimit !== null ||
        coupon.firstOrderOnly) &&
      !customer
    ) {
      reject("Log in to use this code.");
      continue;
    }

    if (
      customer &&
      coupon.perCustomerLimit !== null &&
      (coupon.usedBy[customer.id] ?? 0) >=
        coupon.perCustomerLimit
    ) {
      reject("You've already used this code.");
      continue;
    }

    if (
      coupon.firstOrderOnly &&
      customer &&
      customer.ordersCount > 0
    ) {
      reject("This code is only for your first order.");
      continue;
    }

    if (
      !coupon.stackable &&
      appliedNonStackable
    ) {
      reject(
        `This code can't be combined with ${appliedNonStackable}.`
      );
      continue;
    }

    const eligible = lines.filter((line) => {
      if (coupon.scope.kind === "all") return true;

      if (coupon.scope.kind === "type") {
        return line.service.type === coupon.scope.value;
      }

      return line.service.providerId === coupon.scope.value;
    });

    if (eligible.length === 0) {
      reject("No items in your cart qualify for this code.");
      continue;
    }

    const eligibleAmount = eligible.reduce(
      (sum, line) => sum + line.remaining,
      0
    );

    const minimum = toSatang(coupon.minSpend);

    if (eligibleAmount < minimum) {
      const missing = minimum - eligibleAmount;
      reject(
        `Spend ฿${Number(money(missing)).toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )} more on eligible items to use this code.`
      );
      continue;
    }

    let discount =
      coupon.type === "percent"
        ? percentDiscount(eligibleAmount, coupon.value)
        : toSatang(coupon.value);

    if (coupon.maxDiscount !== null) {
      discount = Math.min(
        discount,
        toSatang(coupon.maxDiscount)
      );
    }

    discount = Math.min(discount, eligibleAmount);

    const shares = eligible.map((line) => ({
      line,
      amount: roundHalfUp(
        discount * line.remaining,
        eligibleAmount
      )
    }));

    const allocated = shares.reduce(
      (sum, share) => sum + share.amount,
      0
    );

    const largest = shares.reduce((best, current) =>
      current.line.remaining > best.line.remaining
        ? current
        : best
    );

    largest.amount += discount - allocated;

    for (const share of shares) {
      share.line.remaining -= share.amount;
      share.line.discounts[result.code] = money(share.amount);
    }

    result.status = "applied";
    result.discount = money(discount);
    delete result.reason;

    if (!coupon.stackable) {
      appliedNonStackable = result.code;
    }
  }

  const discountTotal = lines.reduce(
    (sum, line) =>
      sum +
      Object.values(line.discounts).reduce(
        (total, amount) => total + toSatang(amount),
        0
      ),
    0
  );

  const netAmount = subtotal - discountTotal;
  const vat = roundHalfUp(netAmount * 7, 100);

  return {
    lines: lines.map((line) => ({
      serviceId: line.serviceId,
      quantity: line.quantity,
      amount: money(line.amount),
      discounts: line.discounts,
      amountAfterDiscounts: money(line.remaining)
    })),
    coupons: results.map(({ code, status, discount, reason }) =>
      status === "applied"
        ? { code, status, discount }
        : { code, status, reason }
    ),
    subtotal: money(subtotal),
    discountTotal: money(discountTotal),
    netAmount: money(netAmount),
    vat: money(vat),
    total: money(netAmount + vat)
  };
}
