import { Storage } from '@google-cloud/storage'

const storage = new Storage({
	credentials: JSON.parse(process.env.GCS_CREDENTIALS),
})

const bucketName = process.env.GCS_BUCKET_NAME

/**
 * Przesyła plik do Google Cloud Storage.
 * @param {Buffer} buffer - Bufor pliku do przesłania.
 * @param {string} destination - Nazwa pliku docelowego w GCS.
 * @returns {Promise<string>} Publiczny URL do przesłanego pliku.
 */
export const uploadFileToGCS = (buffer, destination) => {
	return new Promise((resolve, reject) => {
		const file = storage.bucket(bucketName).file(destination)
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
