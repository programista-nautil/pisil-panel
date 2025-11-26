'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Ikony, które umieścimy bezpośrednio w komponencie
const MenuIcon = () => (
	<svg className='h-6 w-6 text-[#005698]' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth={2}
			d='M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z'
		/>
	</svg>
)
const AdminIcon = () => (
	<svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth={2}
			d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
		/>
	</svg>
)
const MemberIcon = () => (
	<svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth={2}
			d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
		/>
	</svg>
)

function HeaderContent() {
	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const menuRef = useRef(null)

	// Ten useEffect jest teraz wywoływany zawsze, gdy HeaderContent jest renderowany.
	// Nie jest już warunkowy.
	useEffect(() => {
		function handleClickOutside(event) {
			if (menuRef.current && !menuRef.current.contains(event.target)) {
				setIsMenuOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [menuRef]) // Zależność jest poprawna

	return (
		<header className='w-full h-25 bg-white border-b shadow-sm flex-shrink-0 border-t-4 border-t-[#005698]'>
			<nav className='px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between py-4'>
				{/* Lewa strona: Logo */}
				<div className='flex-shrink-0'>
					<Link href='/' className='flex items-center '>
						<Image src='/logo.png' alt='Logo PISiL' width={150} height={50} />
					</Link>
				</div>

				{/* Prawa strona: Menu */}
				<div className='relative' ref={menuRef}>
					<button
						onClick={() => setIsMenuOpen(!isMenuOpen)}
						className='p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#005698]'>
						<MenuIcon />
					</button>

					{/* Rozwijane menu */}
					{isMenuOpen && (
						<div className='absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-[#005698] ring-opacity-5 z-50'>
							<div className='py-1' role='menu' aria-orientation='vertical'>
								<Link
									href='/logowanie-admin'
									className='flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
									role='menuitem'
									onClick={() => setIsMenuOpen(false)}>
									<AdminIcon />
									<span>Panel Admina</span>
								</Link>
								<Link
									href='/logowanie-czlonka'
									className='flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
									role='menuitem'
									onClick={() => setIsMenuOpen(false)}>
									<MemberIcon />
									<span>Panel Członka</span>
								</Link>
							</div>
						</div>
					)}
				</div>
			</nav>
		</header>
	)
}

/**
 * Główny komponent, który decyduje, CZY pokazać nagłówek.
 */
export default function GlobalHeader({ initialSession }) {
	const pathname = usePathname()

	const isAuthenticated = !!initialSession?.user

	const isAuthPage =
		pathname.startsWith('/admin') ||
		pathname.startsWith('/member/dashboard') ||
		pathname.startsWith('/panel-admina') ||
		pathname.startsWith('/panel-czlonka')

	if (isAuthenticated || isAuthPage) {
		return null
	}

	// Niezalogowany i na stronie publicznej -> pokaż nagłówek
	return <HeaderContent />
}
