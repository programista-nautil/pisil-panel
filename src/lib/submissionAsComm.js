/**
 * Konwertuje rekord Submission (z communicationNumber) na obiekt
 * kompatybilny z formatem Communication używanym przez CommunicationsByYear i generateSpisHtml.
 *
 * @param {object} sub - rekord Submission
 * @param {object} opts
 * @param {boolean} opts.includeDownloadUrls - czy dołączyć URL pobierania
 * @param {string}  opts.downloadUrlBase     - prefiks API: '/api/admin' lub '/api/member'
 */
export function submissionToComm(sub, { includeDownloadUrls = false, downloadUrlBase = "/api/admin" } = {}) {
  const sentAt = new Date(sub.createdAt);
  const month = sentAt.getMonth() + 1;
  const year = sentAt.getFullYear();

  const downloadUrl =
    includeDownloadUrls && sub.communicationFilePath
      ? `${downloadUrlBase}/submissions/${sub.id}/communication`
      : null;

  return {
    id: sub.id,
    year,
    month,
    number: sub.communicationNumber,
    subject: sub.companyName || "Zgłoszenie",
    title: sub.companyName || "Zgłoszenie",
    body: null,
    authorInitials: null,
    sentAt: sub.createdAt,
    status: "SENT",
    isSpis: false,
    isSubmission: true,
    filePath: sub.communicationFilePath || null,
    fileName: sub.communicationFileName || null,
    downloadUrl,
    attachments: [],
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  };
}
