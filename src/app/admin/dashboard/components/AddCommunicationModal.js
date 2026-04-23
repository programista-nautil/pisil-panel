"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { TrashIcon } from "@heroicons/react/24/outline";
import AuthorSelect from "./AuthorSelect";
import RichTextarea from "./RichTextarea";

export default function AddCommunicationModal({
  isOpen,
  onClose,
  onUploadSuccess,
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [authorInitials, setAuthorInitials] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorPosition, setAuthorPosition] = useState("");
  const [authorLabel, setAuthorLabel] = useState("Przygotowała:");
  const [sentAt, setSentAt] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [pendingFiles, setPendingFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSubject("");
      setBody("");
      setAuthorInitials("");
      setAuthorName("");
      setAuthorPosition("");
      setAuthorLabel("Przygotowała:");
      setSentAt(new Date().toISOString().slice(0, 10));
      setPendingFiles([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAuthorSelect = (author) => {
    setAuthorInitials(author?.initials || "");
    setAuthorName(author?.name || "");
    setAuthorPosition(author?.position || "");
    setAuthorLabel(author?.label || "Przygotowała:");
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFiles((prev) => [...prev, file]);
    e.target.value = "";
  };

  const handleRemovePendingFile = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error("Podaj temat (sprawę) komunikatu.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim() || null,
          authorInitials: authorInitials || null,
          authorName: authorName || null,
          authorPosition: authorPosition || null,
          authorLabel: authorLabel || null,
          sentAt,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Błąd podczas tworzenia komunikatu.");
      }
      const newComm = await res.json();

      const uploadedAttachments = [];
      for (const file of pendingFiles) {
        try {
          const fd = new FormData();
          fd.append("file", file);
          const r = await fetch(
            `/api/admin/communications/${newComm.id}/attachments`,
            { method: "POST", body: fd },
          );
          if (r.ok) {
            const att = await r.json();
            uploadedAttachments.push(att);
          }
        } catch {
          // pomiń nieudane
        }
      }

      toast.success(`Komunikat „${newComm.subject}" zapisany jako szkic.`);
      onUploadSuccess({ ...newComm, attachments: uploadedAttachments });
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-[#005698]">Utwórz komunikat</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Numer zostanie przydzielony po zatwierdzeniu komunikatu.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sprawa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sprawa <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="np. szkolenia PISiL — wiosna 2025"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:border-[#005698]"
            />
          </div>

          {/* Treść */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Treść komunikatu
            </label>
            <RichTextarea
              value={body}
              onChange={setBody}
              rows={6}
              placeholder="Dodaj treść komunikatu..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Data wysyłki */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data wysyłki
              </label>
              <input
                type="date"
                value={sentAt}
                onChange={(e) => setSentAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:border-[#005698]"
              />
            </div>

            {/* Autor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Autor
              </label>
              <AuthorSelect
                value={authorInitials}
                onSelect={handleAuthorSelect}
              />
            </div>
          </div>

          {/* Załączniki */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pliki do pobrania dla członków
            </label>
            {pendingFiles.length > 0 && (
              <ul className="space-y-1 mb-2">
                {pendingFiles.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 bg-gray-50 px-3 py-1.5 rounded text-sm"
                  >
                    <span className="text-gray-700 truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePendingFile(i)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded flex-shrink-0"
                      title="Usuń"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
              + Dodaj plik
              <input
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !subject.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-[#005698] rounded-md hover:bg-[#005698]/80 disabled:opacity-50"
            >
              {isSubmitting ? "Zapisywanie..." : "Zapisz szkic"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
