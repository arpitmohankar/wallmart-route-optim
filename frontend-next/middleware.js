import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Define protected routes
const protectedRoutes = ['/admin', '/driver', '/customer']
const authRoutes = ['/login', '/register']

export function middleware(request) {
  const { pathname } = request.nextUrl
  
  // Get token from cookies
  const token = request.cookies.get('delivery-token')?.value
  
  // Check if it's a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  // Check if it's an auth route
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  // Redirect logic
  if (isProtectedRoute && !token) {
    // User trying to access protected route without token
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  if (isAuthRoute && token) {
    // Logged-in user trying to access auth pages
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
