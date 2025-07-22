import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth(req => {
	const isLoggedIn = !!req.auth
	const { nextUrl } = req

	const isAdminRoute = nextUrl.pathname.startsWith('/admin')

	if (isAdminRoute && !isLoggedIn) {
		return NextResponse.redirect(new URL('/login', nextUrl))
	}
})

export const config = {
	matcher: ['/admin/:path*', '/login'],
}
