import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/auth'
import GlobalHeader from '@/components/GlobalHeader'
import AutoLogout from '@/components/AutoLogout'

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
					<div className='flex flex-col h-full'>
						<GlobalHeader initialSession={session} />
						<main className='flex-1 bg-gray-50'>{children}</main>
					</div>
				</SessionProvider>
			</body>
		</html>
	)
}
