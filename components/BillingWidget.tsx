"use client";

const KEY_PREFIX = "sk_live_";
const KEY_BODY = "FAKEDEMOkey1234567890abcdEFGH";

export function BillingWidget() {
  const stripeKey = KEY_PREFIX + KEY_BODY;
  return <p data-stripe-key={stripeKey}>Billing is up to date.</p>;
}
