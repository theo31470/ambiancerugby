import Stripe from "stripe";

let client: Stripe | null = null;
/** Client Stripe côté serveur. */
export function stripe() {
  const cle = process.env.STRIPE_SECRET_KEY;
  if (!cle) throw new Error("La clé STRIPE_SECRET_KEY n'est pas encore configurée sur Vercel.");
  client ??= new Stripe(cle);
  return client;
}
export const enModeTest = () => (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test");
