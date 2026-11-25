export type CommissionRule = {
  percent: string;
  fixed: string;
  revision: number;
};

// Work in integer hundredths of a peso and hundredths of a percentage point.
// Numbers are converted to decimal strings only at the presentation boundary.
function hundredths(value: string, label: string) {
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(value)) {
    throw new Error(
      `${label}: usa un número positivo o cero, con máximo dos decimales`,
    );
  }
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}

function decimal(value: bigint) {
  const sign = value < BigInt(0) ? "-" : "";
  const absolute = value < BigInt(0) ? -value : value;
  return `${sign}${absolute / BigInt(100)}.${String(absolute % BigInt(100)).padStart(2, "0")}`;
}

export function validateCommissionRule(percent: string, fixed: string) {
  const rate = hundredths(percent, "Porcentaje");
  if (rate > BigInt(10000))
    throw new Error("El porcentaje debe estar entre 0 y 100");
  const fixedAmount = hundredths(fixed, "Cargo fijo");
  return { percent: decimal(rate), fixed: decimal(fixedAmount) };
}

export function createCommissionSnapshot(
  total: string,
  source: string,
  rule?: CommissionRule,
) {
  const basis = hundredths(total, "Total");
  if (source === "manual") {
    return {
      commissionAmount: "0.00",
      commissionPercent: null,
      commissionFixed: null,
      commissionBasis: decimal(basis),
      commissionSource: "not_applicable",
      commissionConfigRevision: null,
      commissionRecordedAt: new Date(),
    };
  }
  if (source !== "web" || !rule)
    throw new Error("Falta configurar la comisión de Mercado Pago");
  const normalized = validateCommissionRule(rule.percent, rule.fixed);
  const rate = hundredths(normalized.percent, "Porcentaje");
  const fixed = hundredths(normalized.fixed, "Cargo fijo");
  // Half-up rounding to one cent, performed once on the percentage component.
  const amount = (basis * rate + BigInt(5000)) / BigInt(10000) + fixed;
  return {
    commissionAmount: decimal(amount),
    commissionPercent: normalized.percent,
    commissionFixed: normalized.fixed,
    commissionBasis: decimal(basis),
    commissionSource: "estimated",
    commissionConfigRevision: rule.revision,
    commissionRecordedAt: new Date(),
  };
}

export function netAfterCommission(total: string, commission: string | null) {
  if (commission === null) return null;
  // A fixed fee may exceed a small payment: preserve a negative net honestly.
  const totalCents = hundredths(total, "Total");
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(commission))
    throw new Error("Comisión inválida");
  const [whole, fraction = ""] = commission.split(".");
  const feeCents =
    BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return decimal(totalCents - feeCents);
}
