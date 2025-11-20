'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'

const INACTIVITY_LIMIT_MS = 29 * 60 * 1000

export default function AutoLogout() {
	const { data: session, status } = useSession()
	const pathname = usePathname()
	const timerRef = useRef(null)
	const lastResetRef = useRef(Date.now())

	const resetTimer = useCallback(() => {
		if (timerRef.current) clearTimeout(timerRef.current)
		timerRef.current = setTimeout(() => {
			console.log('Autowylogowanie z powodu braku aktywności.')
			signOut({ callbackUrl: '/' })
		}, INACTIVITY_LIMIT_MS)
	}, [])

	const handleActivity = useCallback(() => {
		const now = Date.now()

		if (now - lastResetRef.current < 1000) {
			return
		}

		lastResetRef.current = now
		resetTimer()
	}, [resetTimer])

	useEffect(() => {
		if (status !== 'authenticated' || !session) {
			return
		}

		const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']

		events.forEach(event => {
			window.addEventListener(event, handleActivity, { passive: true })
		})

		resetTimer()

		return () => {
			if (timerRef.current) clearTimeout(timerRef.current)
			events.forEach(event => {
				window.removeEventListener(event, handleActivity)
			})
		}
	}, [status, session, pathname, handleActivity, resetTimer])

	return null
}
