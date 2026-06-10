import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";

const PUBLIC_PATHS = new Set<string>(["/login", "/cadastro"]);
// Prefixos que o middleware nunca redireciona. Rotas /api/* fazem o próprio
// auth via Supabase no handler — redirecionar quebraria fetches.
const PUBLIC_PREFIXES = ["/_next", "/api", "/favicon", "/icon", "/static"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    logger.warn(
      "Supabase env vars ausentes — pulando refresh de sessão no middleware."
    );
    return NextResponse.next({ request });
  }

  // Propaga o pathname pra Server Components via header. O Next não expõe
  // a URL da request em `headers()` por padrão.
  request.headers.set("x-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // O fetch do Supabase no edge runtime ocasionalmente falha com "fetch
  // failed" por glitch transitório de rede. Se isso acontecer, segue a request
  // sem redirecionar — a próxima passada resolve com a sessão correta.
  let user: { id: string } | null = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    logger.warn("middleware getUser failed (transient)", {
      message: error instanceof Error ? error.message : String(error),
    });
    return response;
  }

  const pathname = request.nextUrl.pathname;
  const isAuthPath = pathname === "/login" || pathname === "/cadastro";

  if (!user && !isPublicPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
