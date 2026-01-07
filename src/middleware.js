import NextAuth from 'next-auth'
import { authConfig } from '../auth.config'

const { auth } = NextAuth(authConfig)

export default auth

export const config = {
	matcher: [
		'/',
		// Oryginalne ścieżki
		'/admin/:path*',
		// '/member/:path*', // To zastąpimy bardziej precyzyjnym matcherem poniżej, aby wykluczyć api

		// Nowe "ładne" ścieżki (rewrites)
		'/panel-admina/:path*',
		'/panel-czlonka/:path*',
		'/logowanie-admin',
		'/logowanie-czlonka',
		'/zmiana-hasla',

		// Regex dla member, aby złapać wszystko oprócz logowania (dla bezpieczeństwa)
		// Ale skoro mamy logikę w auth.config.js, możemy po prostu dać:
		'/member/:path*',
	],
}
