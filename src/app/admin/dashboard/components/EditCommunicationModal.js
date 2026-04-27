"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { TrashIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import AuthorSelect from "./AuthorSelect";
import RichTextarea from "./RichTextarea";

function padMonth(m) {
  return String(m).padStart(2, "0");
}

export default function EditCommunicationModal({
  communication,
  isOpen,
  onClose,
  onSaved,
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [authorInitials, setAuthorInitials] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorPosition, setAuthorPosition] = useState("");
  const [authorLabel, setAuthorLabel] = useState("Przygotowała:");
  const [sentAt, setSentAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);
  const [localAttachments, setLocalAttachments] = useState([]);

  useEffect(() => {
    if (!isOpen || !communication) return;
    setSubject(communication.subject || "");
    setBody(communication.body || "");
    setAuthorInitials(communication.authorInitials || "");
    setAuthorName(communication.authorName || "");
    setAuthorPosition(communication.authorPosition || "");
    setAuthorLabel(communication.authorLabel || "Przygotowała:");
    setSentAt(
      communication.sentAt
        ? new Date(communication.sentAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    );
    setLocalAttachments(communication.attachments || []);
  }, [isOpen, communication]);

  if (!isOpen || !communication) return null;

  const numLabel =
    communication.number != null
      ? `${communication.number}/${padMonth(communication.month)}/${communication.year}`
      : null;

  const handleAuthorSelect = (author) => {
    setAuthorInitials(author?.initials || "");
    setAuthorName(author?.name || "");
    setAuthorPosition(author?.position || "");
    setAuthorLabel(author?.label || "Przygotowała:");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/communications/${communication.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim() || null,
          authorInitials: authorInitials || null,
          authorName:     authorName     || null,
          authorPosition: authorPosition || null,
          authorLabel:    authorLabel    || null,
          sentAt,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Błąd zapisu.");
      }
      const updated = await res.json();
      toast.success("Komunikat zapisany.");
      onSaved({ ...updated, attachments: localAttachments });
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFile(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(
        `/api/admin/communications/${communication.id}/attachments`,
        { method: "POST", body: fd },
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Błąd uploadu.");
      }
      const attachment = await res.json();
      setLocalAttachments((prev) => [...prev, attachment]);
      toast.success(`Dodano: ${attachment.fileName}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleDeleteAttachment = async (aId) => {
    setDeletingAttachmentId(aId);
    try {
      const res = await fetch(
        `/api/admin/communications/${communication.id}/attachments/${aId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Błąd usuwania.");
      }
      setLocalAttachments((prev) => prev.filter((a) => a.id !== aId));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-[#005698]">
            Edytuj komunikat
          </h3>
          {numLabel && (
            <p className="text-xs text-gray-500 mt-0.5">
              Nr komunikatu:{" "}
              <span className="font-medium text-gray-700">{numLabel}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Sprawa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sprawa
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:border-[#005698]"
            />
          </div>

          {/* Treść */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Treść
            </label>
            <RichTextarea
              key={communication.id}
              value={body}
              onChange={setBody}
              rows={7}
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
              <AuthorSelect value={authorInitials} onSelect={handleAuthorSelect} />
            </div>
          </div>

          {/* Pliki do pobrania dla członków */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pliki do pobrania dla członków
            </label>
            {localAttachments.length > 0 ? (
              <ul className="space-y-1 mb-2">
                {localAttachments.map((att) => (
                  <li
                    key={att.id}
                    className="flex items-center justify-between gap-2 bg-gray-50 px-3 py-1.5 rounded text-sm"
                  >
                    <span className="text-gray-700 truncate">
                      {att.fileName}
                    </span>
                    <div className="flex gap-1 flex-shrink-0">
                      <a
                        href={`/api/admin/communications/${communication.id}/attachments/${att.id}/download`}
                        className="p-1 text-[#005698] hover:bg-[#005698]/10 rounded"
                        title="Pobierz"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id)}
                        disabled={deletingAttachmentId === att.id}
                        className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-40"
                        title="Usuń"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400 mb-2">Brak dodanych plików.</p>
            )}
            <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
              {isUploadingFile ? "Wgrywam..." : "+ Dodaj plik"}
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploadingFile}
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-[#005698] rounded-md hover:bg-[#005698]/80 disabled:opacity-50"
            >
              {isSaving ? "Zapisuję..." : "Zapisz zmiany"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
