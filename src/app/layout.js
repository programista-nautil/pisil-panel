import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/auth'
import GlobalHeader from '@/components/GlobalHeader'
import AutoLogout from '@/components/AutoLogout'
import { Toaster } from 'react-hot-toast'

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
})

export const metadata = {
	title: 'Platforma formularzy PISil',
	description: 'Platforma formularzy PISil do wypełniania formularzy i ankiet.',
}

export default async function RootLayout({ children }) {
	const session = await auth()
	return (
		<html lang='en'>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning={true}>
				<SessionProvider session={session}>
					<AutoLogout />
					<Toaster
						position='botttom-right'
						toastOptions={{
							duration: 4000,
							// Domyślny styl dla wszystkich toastów (białe tło, cień, obramowanie)
							style: {
								background: '#FFFFFF',
								color: '#1F2937', // Ciemny szary (Gray-800)
								border: '1px solid #E5E7EB', // Jasny szary (Gray-200)
								padding: '12px 16px',
								borderRadius: '8px',
								boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // Subtelny cień
								fontSize: '14px',
								fontWeight: '500',
							},
							// Konfiguracja dla sukcesu (tylko ikona jest zielona)
							success: {
								iconTheme: {
									primary: '#005698',
									secondary: '#F3F4F6',
								},
							},
							// Konfiguracja dla błędu (tylko ikona jest czerwona)
							error: {
								iconTheme: {
									primary: '#EF4444', // Red-500
									secondary: '#FEF2F2', // Red-50
								},
							},
						}}
					/>
					<div className='flex flex-col h-full'>
						<GlobalHeader initialSession={session} />
						<main className='flex-1 bg-gray-50'>{children}</main>
					</div>
				</SessionProvider>
			</body>
		</html>
	)
}
