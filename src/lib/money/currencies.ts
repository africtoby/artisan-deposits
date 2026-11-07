// The one table that says how each currency is stored and shown. Fiat is kept as an integer in
// the smallest unit (kobo, cents), so `decimals` is the only thing that ties it to a display value.

export const CURRENCY_CODES = ["NGN", "KES", "GHS", "ZAR", "XOF", "USD", "EUR", "GBP"] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

type CurrencyInfo = {
  name: string;
  decimals: number;
  symbol: string;
  // Alphabetic symbols read better with a space ("KSh 4,000"); signs like ₦ do not need one.
  spaced: boolean;
};

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  NGN: { name: "Nigerian naira", decimals: 2, symbol: "₦", spaced: false },
  KES: { name: "Kenyan shilling", decimals: 2, symbol: "KSh", spaced: true },
  GHS: { name: "Ghanaian cedi", decimals: 2, symbol: "GH₵", spaced: false },
  ZAR: { name: "South African rand", decimals: 2, symbol: "R", spaced: false },
  XOF: { name: "West African CFA franc", decimals: 0, symbol: "CFA", spaced: true },
  USD: { name: "US dollar", decimals: 2, symbol: "$", spaced: false },
  EUR: { name: "Euro", decimals: 2, symbol: "€", spaced: false },
  GBP: { name: "British pound", decimals: 2, symbol: "£", spaced: false },
};

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (CURRENCY_CODES as readonly string[]).includes(value);
}

const groupFormat = new Intl.NumberFormat("en-US", { useGrouping: true });

// Whole numbers show no decimals ("₦40,000"); amounts with a fraction always show every decimal
// ("$12.50") so a column of prices lines up.
export function formatMinor(minor: bigint, currency: CurrencyCode): string {
  const { decimals, symbol, spaced } = CURRENCIES[currency];
  const negative = minor < 0n;
  const absolute = negative ? -minor : minor;
  const factor = 10n ** BigInt(decimals);
  const whole = absolute / factor;
  const fraction = absolute % factor;

  let text = groupFormat.format(whole);
  if (decimals > 0 && fraction !== 0n) {
    text += `.${fraction.toString().padStart(decimals, "0")}`;
  }
  return `${negative ? "-" : ""}${symbol}${spaced ? " " : ""}${text}`;
}

export function formatSats(sats: bigint): string {
  return groupFormat.format(sats);
}
