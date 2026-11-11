import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["signup", "recovery", "magiclink", "invite", "email_change", "email"];

// Liens des e-mails de compte : échange le code (ou le jeton) contre une session, puis redirige vers « suite ».
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const s = url.searchParams.get("suite") ?? "";
  const suite = s.startsWith("/") && !s.startsWith("//") ? s : type === "recovery" ? "/compte/nouveau-mot-de-passe" : "/compte";
  const supabase = await createClient();

  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type && TYPES.includes(type)) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;

  return NextResponse.redirect(new URL(ok ? suite : type === "recovery" ? "/mot-de-passe-oublie?erreur=lien" : "/connexion?erreur=lien", url.origin));
}
