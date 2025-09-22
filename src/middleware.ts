import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/signin'
  ) {
    return NextResponse.next();
  }
  const sessionCookie = request.cookies.get('session');

  if (sessionCookie) {
    return NextResponse.next();
  }
  // when no session cookie
  if (!pathname.startsWith('/api/')) {
    console.log('No session cookie found');
    return new NextResponse('Unauthorized', { status: 401 });
  } else {
    console.log('No session cookie found');
    return NextResponse.redirect(new URL('/signin', request.url));
  }
}
