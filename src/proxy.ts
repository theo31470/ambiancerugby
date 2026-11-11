import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rafraîchit la session Supabase à chaque requête et protège /compte et le studio (connexion + code à 6 chiffres).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const path = request.nextUrl.pathname;
  const vers = (chemin: string, suite: string) => {
    const url = request.nextUrl.clone();
    url.pathname = chemin;
    url.search = "";
    url.searchParams.set("suite", suite);
    return NextResponse.redirect(url);
  };

  if (path.startsWith("/studio")) {
    // studio : jamais indexé ni mis en cache
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "no-store");
    const acces = path === "/studio/connexion" || path === "/studio/securite";
    if (!acces && !data?.claims) return vers("/studio/connexion", path);
    // le second facteur (code à 6 chiffres) est obligatoire pour tout le studio
    if (!acces && data?.claims && data.claims.aal !== "aal2") return vers("/studio/securite", path);
    return response;
  }
  if (!data?.claims && path.startsWith("/compte")) return vers("/connexion", path);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.png|apple-icon.png|logo-blanc.png|og.jpg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
