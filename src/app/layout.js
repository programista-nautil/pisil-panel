import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { SessionProvider } from 'next-auth/react'
import GlobalHeader from '@/components/GlobalHeader'

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

export default function RootLayout({ children }) {
	return (
		<html lang='en' className='h-full'>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}
				suppressHydrationWarning={true}>
				<SessionProvider>
					<div className='flex flex-col min-h-full h-full'>
						<GlobalHeader />
						<main className='flex-1 overflow-y-auto bg-gray-50'>{children}</main>
					</div>
				</SessionProvider>
			</body>
		</html>
	)
}
