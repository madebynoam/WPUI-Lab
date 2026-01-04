import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname === '/auth' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('wp-designer-auth');

  if (!authCookie?.value) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const returnTo = pathname + request.nextUrl.search;
    return NextResponse.redirect(
      new URL(`/auth?returnTo=${encodeURIComponent(returnTo)}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
