const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

export type CartLine = {
  serviceId: string;
  quantity: number;
};

export type CheckoutRequest = {
  lines: CartLine[];
  couponCodes: string[];
  customerId: string | null;
};

export type Service = {
  id: string;
  title: string;
  type: string;
  providerId: number;
  providerName: string;
  price: string;
};

export type QuoteLine = {
  serviceId: string;
  quantity: number;
  amount: string;
  discounts: Record<string, string>;
  amountAfterDiscounts: string;
};

export type CouponResult = {
  code: string;
  status: "applied" | "rejected";
  discount?: string;
  reason?: string;
};

export type Quote = {
  lines: QuoteLine[];
  coupons: CouponResult[];
  subtotal: string;
  discountTotal: string;
  netAmount: string;
  vat: string;
  total: string;
};

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw Object.assign(
      new Error(data.error ?? "Something went wrong."),
      {
        status: response.status,
        data,
      }
    );
  }

  return data as T;
}

export const api = {
  getServices: () => request<Service[]>("/services"),

  quote: (body: CheckoutRequest) =>
    request<Quote>("/quote", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  order: (body: CheckoutRequest) =>
    request<{
      message: string;
      orderId: string;
      quote: Quote;
    }>("/orders", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};