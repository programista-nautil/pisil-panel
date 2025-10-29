export const authConfig = {
	pages: {
		signIn: '/login',
	},
	callbacks: {
		authorized({ auth, request: { nextUrl } }) {
			const isLoggedIn = !!auth?.user
			const userRole = auth?.user?.role

			const isAdminRoute = nextUrl.pathname.startsWith('/admin')
			const isMemberRoute = nextUrl.pathname.startsWith('/member')
			const isLoginPage = nextUrl.pathname === '/login'
			const isMemberLoginPage = nextUrl.pathname === '/member/login'
			const isAuthRoute = isLoginPage || isMemberLoginPage
			const isPublicRoute = isAuthRoute || nextUrl.pathname === '/unauthorized' || nextUrl.pathname === '/' // Zakładamy, że strona główna jest publiczna

			// --- NOWA, BARDZIEJ CZYTELNA LOGIKA ---

			// 1. Ochrona tras /admin
			if (isAdminRoute) {
				if (!isLoggedIn) return false // Niezalogowany -> przekieruj na /login
				if (userRole !== 'admin') return Response.redirect(new URL('/unauthorized', nextUrl)) // Zły rola -> /unauthorized
				return true // Zalogowany admin -> OK
			}

			// 2. Ochrona tras /member (z wyjątkiem /member/login)
			if (isMemberRoute && !isMemberLoginPage) {
				if (!isLoggedIn) return Response.redirect(new URL('/member/login', nextUrl)) // Niezalogowany -> /member/login
				if (userRole !== 'member') return Response.redirect(new URL('/unauthorized', nextUrl)) // Zły rola -> /unauthorized
				return true // Zalogowany członek -> OK
			}

			// 3. Obsługa stron logowania (/login, /member/login)
			if (isAuthRoute) {
				if (isLoggedIn) {
					// Jeśli już zalogowany, przekieruj do odpowiedniego panelu
					const redirectUrl = userRole === 'admin' ? '/admin/dashboard' : '/member/dashboard'
					return Response.redirect(new URL(redirectUrl, nextUrl))
				}
				return true // Jeśli NIEZALOGOWANY -> Zezwól na dostęp do strony logowania
			}

			// 4. Zezwól na dostęp do innych zdefiniowanych tras publicznych (np. /, /unauthorized)
			if (isPublicRoute) {
				return true
			}

			// 5. Domyślne zachowanie dla wszystkich innych, nieznanych tras:
			// Jeśli użytkownik jest zalogowany, zezwól na dostęp.
			// Jeśli nie jest zalogowany, przekieruj na domyślną stronę logowania admina.
			// Możesz to zmienić, jeśli masz inne publiczne strony.
			return isLoggedIn ? true : false
		},

		async jwt({ token, user }) {
			if (user) token.role = user.role
			return token
		},
		async session({ session, token }) {
			if (session.user) session.user.role = token.role
			return session
		},
	},
	providers: [],
}
