import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Public routes that never need auth
const PUBLIC_PATHS = ['/login', '/signup', '/auth'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } });

  // Skip static assets & explicitly-public routes
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/favicon') ||
    PUBLIC_PATHS.some(p => req.nextUrl.pathname.startsWith(p))
  ) {
    return res;
  }

  /* ----------  Supabase SSR client  ---------- */
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: name => req.cookies.get(name)?.value,
        set: (name, value, options: CookieOptions) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // No valid session -> bounce to login
    const login = new URL('/login', req.url);
    login.searchParams.set('redirect', req.nextUrl.pathname); // optional
    return NextResponse.redirect(login);
  }

  // user is present → session cookies (if refreshed) are already attached to res
  return res;
}

/* ----------  Tell Next which paths to run through this middleware  ---------- */
export const config = {
  matcher:
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp)$).*)',
};