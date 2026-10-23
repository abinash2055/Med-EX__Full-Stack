import { randomUUID } from "node:crypto";
import {
  fromSatang,
  parseDecimalScaled,
  roundHalfUp,
  toSatang,
} from "./money";

type CartRequest = {
  lines: { serviceId: string; quantity: number }[];
  couponCodes: string[];
  customerId: string | null;
  at?: string;
};

type CartLine = {
  serviceId: string;
  quantity: number;
  amount: number;
  remaining: number;
  discounts: Record<string, string>;
};

function bangkokDate(at?: string): string {
  const date = at ? new Date(at) : new Date();

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date supplied in at");
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function matchesScope(service: any, scope: any): boolean {
  if (scope.kind === "all") return true;
  if (scope.kind === "type") return service.type === scope.value;
  if (scope.kind === "provider") {
    return service.providerId === scope.value;
  }

  return false;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function moneyMessage(value: number): string {
  return fromSatang(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function reject(reason: string) {
  return { status: "rejected", reason };
}

function calculateDiscount(
  coupon: any,
  eligibleAmount: number
): number {
  if (coupon.type === "percent") {
    // Percent values are represented in thousandths:
    // 10% = 10000, 33.333% = 33333.
    const percent = parseDecimalScaled(coupon.value, 1000);

    let discount = roundHalfUp(
      eligibleAmount * percent,
      100000
    );

    if (coupon.maxDiscount !== null) {
      discount = Math.min(
        discount,
        toSatang(coupon.maxDiscount)
      );
    }

    return Math.min(discount, eligibleAmount);
  }

  return Math.min(toSatang(coupon.value), eligibleAmount);
}

export function calculateQuote(data: any, request: CartRequest) {
  const today = bangkokDate(request.at);

  const lines: CartLine[] = request.lines.map((line) => {
    const service = data.services.find(
      (item: any) => item.id === line.serviceId
    );

    if (!service) {
      throw new Error(`Unknown serviceId: ${line.serviceId}`);
    }

    const amount = toSatang(service.price) * line.quantity;

    return {
      serviceId: line.serviceId,
      quantity: line.quantity,
      amount,
      remaining: amount,
      discounts: {},
    };
  });

  const subtotal = lines.reduce(
    (sum, line) => sum + line.amount,
    0
  );

  const coupons: any[] = [];
  const seen = new Set<string>();
  const candidates: any[] = [];
  const normalizedCodes = request.couponCodes.map(normalizeCode);

  for (const [index, code] of normalizedCodes.entries()) {
    if (seen.has(code)) {
      coupons.push({
        code,
        ...reject("This code is already applied."),
      });
      continue;
    }

    seen.add(code);

    if (candidates.length >= 2) {
      coupons.push({
        code,
        ...reject("You can use up to 2 codes per order."),
      });
      continue;
    }

    const coupon = data.coupons.find(
      (item: any) => item.code === code
    );

    const result: any = {
      code,
      status: "rejected",
      reason: "We don't recognise this code.",
    };

    coupons.push(result);

    candidates.push({
      code,
      coupon,
      result,
      index,
    });
  }

  // Evaluate non-stackable coupons first, preserving input order
  // within each stackability group.
  const evaluationOrder = [...candidates].sort((a, b) => {
    const aStackable = a.coupon?.stackable === true;
    const bStackable = b.coupon?.stackable === true;

    return Number(aStackable) - Number(bStackable) ||
      a.index - b.index;
  });

  const appliedNonStackable: string[] = [];

  for (const candidate of evaluationOrder) {
    const { code, coupon, result } = candidate;

    if (!coupon) {
      result.status = "rejected";
      result.reason = "We don't recognise this code.";
      continue;
    }

    const fail = (reason: string) => {
      result.status = "rejected";
      result.reason = reason;
    };

    if (coupon.status !== "active") {
      fail("This code is no longer active.");
      continue;
    }

    if (today < coupon.startsOn) {
      fail(`This code starts on ${coupon.startsOn}.`);
      continue;
    }

    if (today > coupon.endsOn) {
      fail(`This code expired on ${coupon.endsOn}.`);
      continue;
    }

    if (
      coupon.usageLimit !== null &&
      coupon.usedCount >= coupon.usageLimit
    ) {
      fail("This code has been fully used.");
      continue;
    }

    const customer = data.customers.find(
      (item: any) => item.id === request.customerId
    );

    const loggedIn = Boolean(customer);

    if (
      (coupon.perCustomerLimit !== null ||
        coupon.firstOrderOnly) &&
      !loggedIn
    ) {
      fail("Log in to use this code.");
      continue;
    }

    if (
      coupon.perCustomerLimit !== null &&
      (coupon.usedBy[request.customerId!] ?? 0) >=
        coupon.perCustomerLimit
    ) {
      fail("You've already used this code.");
      continue;
    }

    if (
      coupon.firstOrderOnly &&
      customer.ordersCount > 0
    ) {
      fail("This code is only for your first order.");
      continue;
    }

    if (
      !coupon.stackable &&
      appliedNonStackable.length > 0
    ) {
      fail(
        `This code can't be combined with ${appliedNonStackable[0]}.`
      );
      continue;
    }

    const eligibleLines = lines.filter((line) => {
      const service = data.services.find(
        (item: any) => item.id === line.serviceId
      );

      return matchesScope(service, coupon.scope);
    });

    if (eligibleLines.length === 0) {
      fail("No items in your cart qualify for this code.");
      continue;
    }

    const eligibleAmount = eligibleLines.reduce(
      (sum, line) => sum + line.remaining,
      0
    );

    if (eligibleAmount < toSatang(coupon.minSpend)) {
      const missing =
        toSatang(coupon.minSpend) - eligibleAmount;

      fail(
        `Spend ฿${moneyMessage(missing)} more on eligible items to use this code.`
      );
      continue;
    }

    const discount = calculateDiscount(coupon, eligibleAmount);

    // Proportional shares use each line's amount after earlier
    // discounts. The rounding remainder goes to the first
    // largest eligible line.
    let allocated = 0;
    const shares = eligibleLines.map((line) => {
      const share = roundHalfUp(
        discount * line.remaining,
        eligibleAmount
      );

      allocated += share;

      return { line, share };
    });

    const largest = shares.reduce((best, current) =>
      current.line.remaining > best.line.remaining
        ? current
        : best
    );

    largest.share += discount - allocated;

    for (const { line, share } of shares) {
      line.remaining -= share;
      line.discounts[code] = fromSatang(share);
    }

    result.status = "applied";
    result.discount = fromSatang(discount);
    delete result.reason;

    if (!coupon.stackable) {
      appliedNonStackable.push(code);
    }
  }

  // Return coupon results in the order entered, not evaluation order.
  coupons.sort((a, b) => {
    const ai = normalizedCodes.indexOf(a.code);
    const bi = normalizedCodes.indexOf(b.code);

    return ai - bi;
  });

  const discountTotal = lines.reduce(
    (sum, line) => sum + line.amount - line.remaining,
    0
  );

  const netAmount = subtotal - discountTotal;
  const vat = roundHalfUp(netAmount * 7, 100);

  return {
    lines: lines.map((line) => ({
      serviceId: line.serviceId,
      quantity: line.quantity,
      amount: fromSatang(line.amount),
      discounts: line.discounts,
      amountAfterDiscounts: fromSatang(line.remaining),
    })),
    coupons,
    subtotal: fromSatang(subtotal),
    discountTotal: fromSatang(discountTotal),
    netAmount: fromSatang(netAmount),
    vat: fromSatang(vat),
    total: fromSatang(netAmount + vat),
  };
}

export function validateRequest(data: any, body: any): string | null {
  if (!body || typeof body !== "object") {
    return "Request body must be an object.";
  }

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return "At least one cart line is required.";
  }

  if (
    !Array.isArray(body.couponCodes) ||
    body.couponCodes.some((code: any) => typeof code !== "string")
  ) {
    return "couponCodes must be an array of strings.";
  }

  if (
    body.customerId !== null &&
    body.customerId !== undefined &&
    typeof body.customerId !== "string"
  ) {
    return "customerId must be a string or null.";
  }

  if (
    body.at !== undefined &&
    (typeof body.at !== "string" ||
      Number.isNaN(new Date(body.at).getTime()))
  ) {
    return "at must be a valid date string.";
  }

  for (const line of body.lines) {
    if (
      !line ||
      typeof line.serviceId !== "string" ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 20
    ) {
      return "Each line requires a serviceId and a whole-number quantity from 1 to 20.";
    }

    if (
      !data.services.some(
        (service: any) => service.id === line.serviceId
      )
    ) {
      return `Unknown serviceId: ${line.serviceId}`;
    }
  }

  return null;
}

export function createOrderId(): string {
  return randomUUID();
}