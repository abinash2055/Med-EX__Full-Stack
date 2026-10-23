export function toSatang(value: string | number): number {
  const text = String(value).trim();

  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) {
    throw new Error(`Invalid money amount: ${text}`);
  }

  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [whole, fraction = ""] = unsigned.split(".");
  const result =
    Number(whole) * 100 +
    Number((fraction + "00").slice(0, 2));

  return negative ? -result : result;
}

export function fromSatang(value: number): string {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);

  return (
    sign +
    Math.floor(absolute / 100) +
    "." +
    String(absolute % 100).padStart(2, "0")
  );
}

export function roundHalfUp(
  numerator: number,
  denominator: number
): number {
  if (denominator <= 0 || numerator < 0) {
    throw new Error("Invalid rounding arguments");
  }

  return Math.floor(
    (2 * numerator + denominator) / (2 * denominator)
  );
}

export function parseDecimalScaled(
  value: string | number,
  scale: number
): number {
  const text = String(value).trim();
  const decimals = String(scale).length - 1;

  if (!Number.isInteger(scale) || scale < 1) {
    throw new Error("Invalid decimal scale");
  }

  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);

  if (!match) {
    throw new Error(`Invalid decimal value: ${text}`);
  }

  const fraction = match[2] ?? "";

  if (fraction.length > decimals) {
    throw new Error(`Too many decimal places: ${text}`);
  }

  return (
    Number(match[1]) * scale +
    Number((fraction + "0".repeat(decimals)).slice(0, decimals) || 0)
  );
}