import NextAuth from 'next-auth'
import { authConfig } from '../auth.config'

const { auth } = NextAuth(authConfig)

export default auth

export const config = {
	matcher: [
		// Dopasuj wszystkie ścieżki /admin/*
		'/admin/:path*',
		// Dopasuj wszystkie ścieżki /member/* OPRÓCZ /member/login
		'/member/((?!login$).*)',
	],
}
