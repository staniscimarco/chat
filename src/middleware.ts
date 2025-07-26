import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Get the session token from cookies
  const sessionToken = request.cookies.get('session_token')?.value;

  // Define public paths that don't require authentication
  const publicPaths = ['/login', '/register', '/setup'];
  const isPublicPath = publicPaths.includes(path);

  // If the user is not authenticated and trying to access a protected route (including root)
  if (!sessionToken && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If the user is authenticated and trying to access login/register
  if (sessionToken && isPublicPath) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Continue with the request
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 