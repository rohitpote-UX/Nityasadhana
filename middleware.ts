import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_EXACT_ROUTES = new Set([
  "/",
  "/about",
  "/design-system",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon.svg",
  "/sw.js",
]);

const PUBLIC_ROUTE_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/brand/",
  "/icons/",
  "/workbox-",
];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/_")) {
    return true;
  }
  if (PUBLIC_EXACT_ROUTES.has(pathname)) {
    return true;
  }
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = isPublicPath(pathname);
  const sessionToken = req.cookies.get("nityasadhana_session")?.value;

  // Fail-Closed Security Policy: Require valid session cookie on protected routes
  if (!isPublic && !sessionToken) {
    const signInUrl = new URL("/login", req.url);
    signInUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const response = NextResponse.next();

  // Attach defense-in-depth HTTP security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static asset files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
