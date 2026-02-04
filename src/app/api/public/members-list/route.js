import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
	try {
		const filePath = path.join(process.cwd(), 'src/config/publicMembersList.json')

		if (!fs.existsSync(filePath)) {
			return NextResponse.json([], { status: 200 })
		}

		const fileContent = fs.readFileSync(filePath, 'utf-8')
		const members = JSON.parse(fileContent)

		members.sort((a, b) => a.Nazwa.localeCompare(b.Nazwa, 'pl'))

		return new NextResponse(JSON.stringify(members), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, OPTIONS',
			},
		})
	} catch (error) {
		console.error('Błąd API listy członków:', error)
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
	}
}

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
		},
	})
}
