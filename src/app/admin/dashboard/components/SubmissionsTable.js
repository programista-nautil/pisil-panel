'use client'
import { Fragment, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import StatusDropdown from './StatusDropdown'
import { PencilSquareIcon } from '@heroicons/react/24/solid'
import {
	ArchiveBoxArrowDownIcon,
	ArrowUpOnSquareIcon,
	UserIcon,
	Cog8ToothIcon,
	CloudArrowUpIcon,
} from '@heroicons/react/24/outline'
import { getFormTypeName } from '../../../../utils/getFormTypeName'

const AttachmentList = ({ title, icon: Icon, files, submissionId, onDownload, onDelete, deletingId }) => (
	<div>
		<h4 className='text-sm font-semibold text-gray-800 tracking-wide flex items-center gap-2 mb-3'>
			<Icon className='h-5 w-5 text-gray-500' />
			{title}
			<span className='ml-1 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700'>
				{files.length}
			</span>
		</h4>
		{files.length > 0 ? (
			<ul className='divide-y divide-gray-200 rounded-md border border-gray-200 bg-white shadow-sm'>
				{files.map(att => (
					<li key={att.id} className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 group'>
						<div className='flex items-start sm:items-center gap-3 min-w-0'>
							<div className='mt-0.5 flex-shrink-0 rounded-md bg-blue-50 p-1.5 text-blue-600 border border-blue-100'>
								<svg className='h-4 w-4' viewBox='0 0 20 20' fill='currentColor'>
									<path d='M4 2a2 2 0 00-2 2v1a1 1 0 001 1v8a2 2 0 002 2h2.1a1 1 0 01.948.684l.3.9a1 1 0 00.948.684h1.508a1 1 0 00.948-.684l.3-.9A1 1 0 0114.9 16H17a2 2 0 002-2V5a1 1 0 001-1V4a2 2 0 00-2-2H4z' />
								</svg>
							</div>
							<div className='min-w-0'>
								<p className='text-sm font-medium text-gray-800 truncate'>{att.fileName}</p>
								<p className='text-xs text-gray-500'>
									{/* Można dodać rozmiar / typ pliku później */}
									Plik dodatkowy
								</p>
							</div>
						</div>
						<div className='flex items-center gap-2 self-end sm:self-auto'>
							<button
								type='button'
								onClick={() => onDownload(submissionId, att.id)}
								className='inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500'>
								<svg className='h-4 w-4' viewBox='0 0 20 20' fill='currentColor'>
									<path
										fillRule='evenodd'
										d='M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z'
										clipRule='evenodd'
									/>
								</svg>
								<span>Pobierz</span>
							</button>
							<button
								type='button'
								onClick={() => onDelete(submissionId, att.id, att.fileName)}
								disabled={deletingId === att.id}
								className='inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 hover:border-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60 disabled:cursor-not-allowed'>
								{deletingId === att.id ? (
									<svg className='h-4 w-4 animate-spin' viewBox='0 0 24 24' fill='none'>
										<circle
											className='opacity-25'
											cx='12'
											cy='12'
											r='10'
											stroke='currentColor'
											strokeWidth='4'></circle>
										<path
											className='opacity-75'
											fill='currentColor'
											d='M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z'></path>
									</svg>
								) : (
									<svg className='h-4 w-4' viewBox='0 0 20 20' fill='currentColor'>
										<path
											fillRule='evenodd'
											d='M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z'
											clipRule='evenodd'
										/>
									</svg>
								)}
								<span>{deletingId === att.id ? 'Usuwanie...' : 'Usuń'}</span>
							</button>
						</div>
					</li>
				))}
			</ul>
		) : (
			<p className='text-sm text-gray-500 italic px-2'>Brak plików w tej sekcji.</p>
		)}
	</div>
)

export default function SubmissionsTable({
	submissions,
	expanded,
	toggleExpanded,
	handleStatusChange,
	handleDownloadAttachment,
	openAttachmentDeleteModal,
	deletingAttachmentId,
	openDeleteModal,
	onArchiveToggle,
	onMemberFileUpload,
	uploadingMemberFileId,
}) {
	if (!submissions || submissions.length === 0) {
		return <p className='p-6 text-center text-gray-500'>Brak zgłoszeń do wyświetlenia w tej kategorii.</p>
	}

	const hasExpandableRows = submissions.some(s => s.formType === 'DEKLARACJA_CZLONKOWSKA' || s.formType === 'PATRONAT')

	return (
		<div className='overflow-x-auto'>
			<table className='w-full text-sm text-left text-gray-500'>
				<thead className='text-xs text-gray-700 uppercase bg-gray-50'>
					<tr>
						{hasExpandableRows && <th className='w-8 px-2 py-4' aria-label='Rozwiń' />}
						<th scope='col' className='px-14 py-4 font-semibold'>
							Status
						</th>
						<th scope='col' className='px-6 py-4 font-semibold'>
							Typ formularza
						</th>
						<th scope='col' className='px-6 py-4 font-semibold'>
							Nazwa Firmy / Zgłaszający
						</th>
						<th scope='col' className='px-6 py-4 font-semibold'>
							Email Kontaktowy
						</th>
						<th scope='col' className='px-6 py-4 font-semibold'>
							Data Złożenia
						</th>
						<th scope='col' className='px-6 py-4 font-semibold text-right'>
							Akcje
						</th>
					</tr>
				</thead>
				<tbody>
					{submissions.map(submission => {
						const isOpen = expanded[submission.id]
						const isExpandable = submission.formType === 'DEKLARACJA_CZLONKOWSKA' || submission.formType === 'PATRONAT'
						const clientFiles = submission.attachments?.filter(att => att.source === 'CLIENT_UPLOAD') || []
						const generatedFiles = submission.attachments?.filter(att => att.source === 'GENERATED') || []

						return (
							<Fragment key={submission.id}>
								{/* Główny wiersz */}
								<tr className='bg-white border-t hover:bg-gray-50'>
									{hasExpandableRows && (
										<td className='px-2 py-4 text-center align-top'>
											{isExpandable && (
												<button onClick={() => toggleExpanded(submission.id)} className='p-1 rounded hover:bg-gray-200'>
													<svg
														className={`h-5 w-5 transform transition-transform ${isOpen ? 'rotate-90' : ''}`}
														fill='none'
														stroke='currentColor'
														viewBox='0 0 24 24'>
														<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
													</svg>
												</button>
											)}
										</td>
									)}
									<td className='px-6 py-4'>
										<StatusDropdown submission={submission} onStatusChange={handleStatusChange} />
									</td>
									<td className='px-6 py-4 whitespace-nowrap'>{getFormTypeName(submission.formType)}</td>
									<td className='px-6 py-4 font-medium text-gray-900 whitespace-nowrap'>
										<div className='flex items-center gap-2'>
											<span>{submission.companyName || 'Brak nazwy'}</span>
											{submission.createdByAdmin && (
												<span title='Dodane ręcznie przez administratora'>
													<PencilSquareIcon className='h-5 w-5 text-gray-400' />
												</span>
											)}
										</div>
									</td>
									<td className='px-6 py-4'>{submission.email || 'Brak emaila'}</td>
									<td className='px-6 py-4'>
										{new Date(submission.createdAt).toLocaleString('pl-PL', {
											dateStyle: 'short',
											timeStyle: 'short',
										})}
									</td>
									<td className='px-6 py-4 text-right'>
										<div className='flex items-center justify-end gap-2'>
											{onArchiveToggle && (
												<button
													onClick={() => onArchiveToggle(submission, !submission.isArchived)}
													className='p-2 text-gray-500 hover:bg-gray-100 rounded-md'
													title={submission.isArchived ? 'Przywróć z archiwum' : 'Archiwizuj'}>
													{submission.isArchived ? (
														<ArrowUpOnSquareIcon className='h-5 w-5' />
													) : (
														<ArchiveBoxArrowDownIcon className='h-5 w-5' />
													)}
												</button>
											)}
											<Link
												href={`/api/admin/submissions/${submission.id}/download`}
												className='p-2 text-blue-600 hover:bg-blue-100 rounded-md'
												title='Pobierz PDF'>
												<svg className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
													<path
														fillRule='evenodd'
														d='M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z'
														clipRule='evenodd'
													/>
												</svg>
											</Link>
											<button
												onClick={() => openDeleteModal(submission)}
												className='p-2 text-red-600 hover:bg-red-100 rounded-md'
												title='Usuń zgłoszenie'>
												<svg className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
													<path
														fillRule='evenodd'
														d='M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z'
														clipRule='evenodd'
													/>
												</svg>
											</button>
										</div>
									</td>
								</tr>
								{/* Wiersz z załącznikami (rozwijany) */}
								{isOpen && isExpandable && (
									<tr className='bg-gray-50 border-t'>
										<td colSpan={hasExpandableRows ? 7 : 6} className='px-10 py-5'>
											<div className='bg-white/60 backdrop-blur-sm border border-gray-200 rounded-lg p-5 shadow-inner space-y-6'>
												<AttachmentList
													title='Pliki od klienta / Dodane ręcznie'
													icon={UserIcon}
													files={clientFiles}
													submissionId={submission.id}
													onDownload={handleDownloadAttachment}
													onDelete={openAttachmentDeleteModal}
													deletingId={deletingAttachmentId}
												/>
												<AttachmentList
													title='Wygenerowane pliki przyjęcia'
													icon={Cog8ToothIcon}
													files={generatedFiles}
													submissionId={submission.id}
													onDownload={handleDownloadAttachment}
													onDelete={openAttachmentDeleteModal}
													deletingId={deletingAttachmentId}
												/>
											</div>
										</td>
									</tr>
								)}
							</Fragment>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}
