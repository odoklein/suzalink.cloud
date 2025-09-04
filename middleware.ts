import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const { auth } = req;
  
  // Redirect to login if no session
  if (!auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Role-based access control
  const userRole = auth.user?.role as string;
  
  // Admin-only routes
  const adminRoutes = [
    "/dashboard/users",
    "/dashboard/settings",
    "/api/admin",
  ];
  
  // Manager+ routes (manager and admin)
  const managerRoutes = [
    "/dashboard/finance",
    "/dashboard/analytics",
  ];
  
  // Check admin routes
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (userRole !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }
  
  // Check manager routes
  if (managerRoutes.some(route => pathname.startsWith(route))) {
    if (userRole !== "admin" && userRole !== "manager") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Add security headers
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.supabase.co https://*.supabase.co wss://*.supabase.co",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  
  response.headers.set("Content-Security-Policy", csp);
  
  return response;
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - api/lists (list operations - no auth required)
     * - api/prospects/lists (list operations - no auth required)
     * - api/prospects/folders (folder/list operations - no auth required)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|api/lists|api/prospects/lists|api/prospects/folders|_next/static|_next/image|favicon.ico|public|login|register).*)",
  ],
}; 