'use client'

import GeneralFileManager from './GeneralFileManager'
import MemberBrowser from './MemberBrowser'

export default function MemberManagement() {
	return (
		<div className='space-y-8'>
			<GeneralFileManager />
			<MemberBrowser />
		</div>
	)
}
