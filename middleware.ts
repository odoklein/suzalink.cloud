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
  
  // Define route permissions
  const routePermissions = {
    // Client Management - Admin and Dev only
    clientRoutes: [
      "/dashboard/clients",
      "/api/clients"
    ],
    
    // User Management - Admin and Dev only
    userManagementRoutes: [
      "/dashboard/utilisateurs",
      "/api/users/management"
    ],
    
    // Invoice Management - Manager, Admin, Dev only
    invoiceRoutes: [
      "/dashboard/invoices",
      "/api/invoices"
    ],
    
    // Project Management - Everyone (admin, manager, user, commercial, dev)
    projectRoutes: [
      "/dashboard/projects"
    ],
    
    // Email Management - Everyone
    emailRoutes: [
      "/dashboard/emails",
      "/api/emails"
    ],
    
    // Prospect Management - Everyone (with role-based filtering in API)
    prospectRoutes: [
      "/dashboard/prospects",
      "/api/prospects"
    ],
    
  };
  
  // Check Client Management routes (Admin and Dev only)
  if (routePermissions.clientRoutes.some(route => pathname.startsWith(route))) {
    if (userRole !== "admin" && userRole !== "dev") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }
  
  // Check User Management routes (Admin and Dev only)
  if (routePermissions.userManagementRoutes.some(route => pathname.startsWith(route))) {
    if (userRole !== "admin" && userRole !== "dev") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }
  
  // Check Invoice Management routes (Manager, Admin, Dev only)
  if (routePermissions.invoiceRoutes.some(route => pathname.startsWith(route))) {
    if (userRole !== "admin" && userRole !== "manager" && userRole !== "dev") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }
  
  // Project and Email routes are accessible to everyone, no additional checks needed

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
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|api/lists|_next/static|_next/image|favicon.ico|public|login|register).*)",
  ],
}; 