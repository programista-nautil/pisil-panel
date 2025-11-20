import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { authConfig } from '../auth.config'

export const {
	handlers: { GET, POST },
	auth,
	signIn,
	signOut,
} = NextAuth({
	...authConfig,
	providers: [
		CredentialsProvider({
			id: 'admin-credentials',
			name: 'Admin Login',
			credentials: {
				username: { label: 'Username', type: 'text' },
				password: { label: 'Password', type: 'password' },
			},
			async authorize(credentials) {
				if (
					credentials.username === process.env.ADMIN_USERNAME &&
					credentials.password === process.env.ADMIN_PASSWORD
				) {
					return { id: 'admin-user', name: 'Admin', role: 'admin' }
				}
				return null
			},
		}),
		CredentialsProvider({
			id: 'member-credentials',
			name: 'Member Login',
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' },
			},
			async authorize(credentials) {
				console.log('[Auth] Attempting member login with credentials:', credentials) // LOG 1: Zobacz, co dotarło

				if (!credentials?.email || !credentials?.password) {
					console.log('[Auth] Missing email or password.')
					return null
				}

				try {
					// Dodajemy try...catch dla pewności
					const member = await prisma.member.findUnique({
						where: { email: credentials.email },
					})

					console.log('[Auth] Found member in DB:', member) // LOG 2: Czy znaleziono członka?

					if (!member) {
						console.log('[Auth] Member not found.')
						return null
					}

					const isPasswordValid = await bcrypt.compare(credentials.password, member.password)

					console.log('[Auth] Password validation result:', isPasswordValid) // LOG 3: Czy hasło pasuje?

					if (!isPasswordValid) {
						console.log('[Auth] Invalid password.')
						return null
					}

					console.log('[Auth] Login successful for:', member.email) // LOG 4: Sukces
					return {
						id: member.id,
						name: member.name || member.email,
						email: member.email,
						role: 'member',
					}
				} catch (error) {
					console.error('[Auth] Error during authorization:', error) // LOG 5: Złap inne błędy
					return null
				}
			},
		}),
	],
	session: {
		strategy: 'jwt',
		maxAge: 30 * 60,
	},
	secret: process.env.NEXTAUTH_SECRET,
})
