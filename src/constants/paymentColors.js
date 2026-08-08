export const TOTAL_REVENUE_TEXT_CLASS = "text-sky-700";

export const PAYMENT_TOTAL_TEXT_CLASSES = {
  Cash: "text-emerald-700",
  Yoco: "text-sky-600",
  EFT: "text-amber-700",
  Uberzol: "text-violet-700",
};

export const PAYMENT_BADGE_CLASSES = {
  Cash: "bg-emerald-100 text-emerald-700",
  Yoco: "bg-sky-100 text-sky-700",
  EFT: "bg-amber-100 text-amber-700",
  Uberzol: "bg-violet-100 text-violet-700",
};

export function getPaymentTotalTextClass(paymentMethod) {
  return PAYMENT_TOTAL_TEXT_CLASSES[paymentMethod] || "text-slate-900";
}

export function getPaymentBadgeClass(paymentMethod) {
  return PAYMENT_BADGE_CLASSES[paymentMethod] || "bg-slate-100 text-slate-700";
}
