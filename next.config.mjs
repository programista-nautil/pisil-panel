/** @type {import('next').NextConfig} */
const nextConfig = {
	// Dodajemy nową konfigurację rewrites
	async rewrites() {
		return [
			{
				source: '/logowanie-admin', // To jest "ładny" URL, który widzi użytkownik
				destination: '/login', // To jest faktyczna ścieżka pliku w /app
			},
			{
				source: '/logowanie-czlonka', // To jest "ładny" URL, który widzi użytkownik
				destination: '/member/login', // To jest faktyczna ścieżka pliku w /app
			},
		]
	},
}

export default nextConfig
