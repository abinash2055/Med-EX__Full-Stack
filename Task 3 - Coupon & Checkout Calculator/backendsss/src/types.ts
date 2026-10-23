
export interface Service {
  id: string;
  title: string;
  type: string;
  providerId: number;
  providerName: string;
  price: string;
}

export interface Customer {
  id: string;
  name: string;
  ordersCount: number;
}

export interface Coupon {
  code: string;
  type: "percent" | "fixed";
  value: string;
  maxDiscount: string | null;
  minSpend: string;
  scope: {
    kind: "all" | "type" | "provider";
    value?: string | number;
  };
  startsOn: string;
  endsOn: string;
  usageLimit: number | null;
  usedCount: number;
  perCustomerLimit: number | null;
  usedBy: Record<string, number>;
  firstOrderOnly: boolean;
  stackable: boolean;
  status: string;
}

export interface CheckoutData {
  services: Service[];
  customers: Customer[];
  coupons: Coupon[];
}

export interface CheckoutRequest {
  lines: {
    serviceId: string;
    quantity: number;
  }[];
  couponCodes: string[];
  customerId: string | null;
  at?: string;
}
