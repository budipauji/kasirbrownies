import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that do NOT require authentication
const PUBLIC_PREFIXES = [
    "/auth/",
    "/api/auth",
    "/api/health",
    "/_next",
    "/favicon.ico",
    "/manifest.json",
    "/icons",
    "/sw.js",
];

function isPublicRoute(pathname: string): boolean {
    return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Skip public routes
    if (isPublicRoute(pathname)) {
        return NextResponse.next();
    }

    // Get session token from cookie (better-auth sets this automatically)
    const sessionToken =
        req.cookies.get("better-auth.session_token")?.value ||
        req.cookies.get("__Secure-better-auth.session_token")?.value;

    if (!sessionToken) {
        // For API routes, return 401 JSON
        if (pathname.startsWith("/api/")) {
            return NextResponse.json(
                { error: "Unauthorized", message: "Session tidak valid atau sudah expired" },
                { status: 401 }
            );
        }

        // For pages, redirect to login
        const loginUrl = new URL("/auth/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Forward session token as x-session-token header for use in API handlers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-session-token", sessionToken);

    return NextResponse.next({
        request: { headers: requestHeaders },
    });
}

export const config = {
    matcher: [
        // Match all paths except _next/static, _next/image, and favicon
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
