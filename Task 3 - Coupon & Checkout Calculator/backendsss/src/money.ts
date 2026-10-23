
export function toSatang(value: string | number): number {
  const text = String(value);

  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) {
    throw new Error(`Invalid money amount: ${text}`);
  }

  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [baht, fraction = ""] = unsigned.split(".");
  const satang =
    Number(baht) * 100 +
    Number((fraction + "00").slice(0, 2));

  return negative ? -satang : satang;
}

export function roundHalfUp(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    throw new Error("Denominator must be positive");
  }

  const sign = numerator < 0 ? -1 : 1;
  const absolute = Math.abs(numerator);

  return sign * Math.floor(
    (absolute + Math.floor(denominator / 2)) / denominator
  );
}

export function money(satang: number): string {
  const sign = satang < 0 ? "-" : "";
  const absolute = Math.abs(satang);

  return `${sign}${Math.floor(absolute / 100)}.${String(
    absolute % 100
  ).padStart(2, "0")}`;
}

export function percentDiscount(
  amount: number,
  percentage: string
): number {
  const [whole, fraction = ""] = percentage.split(".");
  const precision = 10 ** fraction.length;
  const percentUnits =
    Number(whole) * precision + Number(fraction);

  return roundHalfUp(
    amount * percentUnits,
    100 * precision
  );
}
