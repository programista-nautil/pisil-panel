import { Storage } from '@google-cloud/storage'

const storage = new Storage({
	credentials: JSON.parse(process.env.GCS_CREDENTIALS),
})

const bucketName = process.env.GCS_BUCKET_NAME
const bucket = storage.bucket(bucketName)

/**
 * Przesyła plik do Google Cloud Storage.
 * @param {Buffer} buffer - Bufor pliku do przesłania.
 * @param {string} destination - Nazwa pliku docelowego w GCS.
 * @returns {Promise<string>} Publiczny URL do przesłanego pliku.
 */
export const uploadFileToGCS = (buffer, destination) => {
	return new Promise((resolve, reject) => {
		const file = bucket.file(destination)
		const stream = file.createWriteStream({
			metadata: {
				contentType: 'application/pdf',
			},
			resumable: false,
		})

		stream.on('error', err => {
			reject(err)
		})

		stream.on('finish', () => {
			// Plik jest domyślnie prywatny, zwracamy tylko nazwę/ścieżkę
			resolve(destination)
		})

		stream.end(buffer)
	})
}

/**
 * Pobiera plik z Google Cloud Storage jako bufor.
 * @param {string} fileName - Nazwa pliku do pobrania.
 * @returns {Promise<Buffer>} Bufor z zawartością pliku.
 */
export const downloadFileFromGCS = async fileName => {
	try {
		const [buffer] = await bucket.file(fileName).download()
		return buffer
	} catch (error) {
		console.error(`Nie udało się pobrać pliku ${fileName} z GCS:`, error)
		throw new Error('File not found in GCS')
	}
}

/**
 * Usuwa plik z Google Cloud Storage.
 * @param {string} fileName - Nazwa pliku do usunięcia.
 * @returns {Promise<void>}
 */
export const deleteFileFromGCS = async fileName => {
	try {
		await bucket.file(fileName).delete()
		console.log(`Plik ${fileName} został usunięty z GCS.`)
	} catch (error) {
		console.error(`Nie udało się usunąć pliku ${fileName} z GCS:`, error)
		// Rzucamy błąd dalej, aby API mogło go obsłużyć
		throw new Error('Nie udało się usunąć pliku z GCS')
	}
}
