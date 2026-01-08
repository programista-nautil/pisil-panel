export const authConfig = {
	pages: {
		signIn: '/login',
	},
	callbacks: {
		authorized({ auth, request: { nextUrl } }) {
			const isLoggedIn = !!auth?.user
			const userRole = auth?.user?.role
			const pathname = nextUrl.pathname // Dla czytelności

			const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/panel-admina')
			const isMemberRoute = pathname.startsWith('/member') || pathname.startsWith('/panel-czlonka')

			// Definiujemy publiczne ścieżki auth (zarówno oryginalne, jak i przepisane)
			const isLoginPage = pathname === '/login' || pathname === '/logowanie-admin'
			const isMemberLoginPage = pathname === '/member/login' || pathname === '/logowanie-czlonka'

			// Reset hasła też ma rewrite
			const isMemberResetPage = pathname.startsWith('/member/reset-password') || pathname.startsWith('/zmiana-hasla')

			const isPublicAuthRoute = isLoginPage || isMemberLoginPage || isMemberResetPage
			const isPublicRoute = isPublicAuthRoute || pathname === '/unauthorized'

			if (pathname === '/') {
				if (isLoggedIn) {
					// Jeśli zalogowany, przekieruj do odpowiedniego panelu
					const redirectUrl = userRole === 'admin' ? '/panel-admina' : '/panel-czlonka'
					return Response.redirect(new URL(redirectUrl, nextUrl))
				}
				// Jeśli nie jest zalogowany, pozwól wejść na stronę główną
				return true
			}

			// --- NOWA, BARDZIEJ CZYTELNA LOGIKA ---

			// 1. Ochrona tras /admin
			if (isAdminRoute) {
				if (!isLoggedIn) return false // Niezalogowany -> przekieruj na /login
				if (userRole !== 'admin') return Response.redirect(new URL('/unauthorized', nextUrl)) // Zły rola -> /unauthorized
				return true // Zalogowany admin -> OK
			}

			// 2. Ochrona tras /member (z wyjątkiem /member/login)
			if (isMemberRoute && !isPublicAuthRoute) {
				// Tutaj mała zmiana: przekieruj na "ładny" URL logowania
				if (!isLoggedIn) return Response.redirect(new URL('/logowanie-czlonka', nextUrl))
				if (userRole !== 'member') return Response.redirect(new URL('/unauthorized', nextUrl))
				return true
			}

			// 3. Obsługa stron logowania (/login, /member/login)
			if (isPublicAuthRoute) {
				if (isLoggedIn) {
					// Przekieruj na "ładne" URL-e paneli
					const redirectUrl = userRole === 'admin' ? '/panel-admina' : '/panel-czlonka'
					return Response.redirect(new URL(redirectUrl, nextUrl))
				}
				return true
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

		async jwt({ token, user, trigger, session }) {
			if (user) {
				token.role = user.role
				token.id = user.id
				token.mustChangePassword = user.mustChangePassword
			}
			if (trigger === 'update' && session?.user) {
				token.name = session.user.name
				token.email = session.user.email

				if (session.user.mustChangePassword !== undefined) {
					token.mustChangePassword = session.user.mustChangePassword
				}
			}
			return token
		},
		async session({ session, token }) {
			if (session.user) {
				session.user.role = token.role
				session.user.id = token.id
				session.user.mustChangePassword = token.mustChangePassword
			}
			return session
		},
	},
	providers: [],
}
