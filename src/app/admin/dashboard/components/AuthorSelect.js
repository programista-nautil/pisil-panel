"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronDownIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";

const EMPTY_FORM = { initials: "", label: "Przygotowała:", name: "", position: "" };

// ---------------------------------------------------------------------------
// Mini-modal edycji / dodawania autora
// ---------------------------------------------------------------------------

function AuthorFormModal({ author, onSave, onClose }) {
  const isNew = !author;
  const [form, setForm] = useState(
    author
      ? { initials: author.initials, label: author.label || "", name: author.name || "", position: author.position || "" }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const initials = form.initials.trim().toUpperCase().slice(0, 5);
    if (!initials) return;
    setSaving(true);
    try {
      await onSave({ ...form, initials });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-900/60 z-[60] flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="text-sm font-bold text-[#005698] mb-4">
          {isNew ? "Dodaj autora" : `Edytuj autora — ${author.initials}`}
        </h4>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Inicjały {isNew && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={form.initials}
                onChange={(e) => setForm((f) => ({ ...f, initials: e.target.value.toUpperCase().slice(0, 5) }))}
                placeholder="np. TJ"
                disabled={!isNew}
                autoFocus={isNew}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:border-[#005698] disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Etykieta
              </label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Przygotowała:"
                autoFocus={!isNew}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:border-[#005698]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Imię i nazwisko
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="np. Faryda Dopart"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:border-[#005698]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Stanowisko
            </label>
            <input
              type="text"
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              placeholder="np. Specjalistka ds. celnych"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:border-[#005698]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !form.initials.trim()}
            className="px-3 py-1.5 text-sm text-white bg-[#005698] rounded-md hover:bg-[#005698]/80 disabled:opacity-50"
          >
            {saving ? "Zapisuję…" : isNew ? "Dodaj" : "Zapisz"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Główny komponent
// ---------------------------------------------------------------------------

export default function AuthorSelect({ value, onSelect }) {
  const [authors, setAuthors] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [formModal, setFormModal] = useState(null); // null | "new" | {author obj}
  const [deleteModal, setDeleteModal] = useState(null); // null | author
  const containerRef = useRef(null);

  useEffect(() => {
    fetch("/api/admin/communications/authors")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setAuthors(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const onKey = (e) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const handleSelect = (author) => {
    onSelect(author ?? null);
    setIsOpen(false);
  };

  // ── Zapis nowego / edycja ────────────────────────────────────────────────

  const handleFormSave = async (formData) => {
    const isNew = formModal === "new";
    try {
      if (isNew) {
        const res = await fetch("/api/admin/communications/authors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Błąd zapisu.");
        const created = await res.json();
        setAuthors((prev) =>
          [...prev, created].sort((a, b) => a.initials.localeCompare(b.initials)),
        );
      } else {
        const original = formModal.initials;
        const res = await fetch(
          `/api/admin/communications/authors/${encodeURIComponent(original)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          },
        );
        if (!res.ok) throw new Error("Błąd zapisu.");
        const updated = await res.json();
        setAuthors((prev) =>
          prev
            .map((a) => (a.initials === original ? updated : a))
            .sort((a, b) => a.initials.localeCompare(b.initials)),
        );
        if (value === original) onSelect(updated);
      }
      setFormModal(null);
      toast.success(isNew ? "Autor dodany." : "Autor zapisany.");
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  // ── Usuwanie ─────────────────────────────────────────────────────────────

  const handleConfirmDelete = async () => {
    const res = await fetch(
      `/api/admin/communications/authors/${encodeURIComponent(deleteModal.initials)}`,
      { method: "DELETE" },
    );
    if (!res.ok) throw new Error("Błąd usuwania.");
    setAuthors((prev) => prev.filter((a) => a.initials !== deleteModal.initials));
    if (value === deleteModal.initials) onSelect(null);
    setDeleteModal(null);
  };

  return (
    <>
      <div ref={containerRef} className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#005698] hover:bg-gray-50"
        >
          <span className={value ? "text-gray-900 font-medium" : "text-gray-400"}>
            {value || "— wybierz autora —"}
          </span>
          <ChevronDownIcon
            className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-30 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100">
              {/* Pusty wybór */}
              <li>
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className={`w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 transition-colors ${!value ? "bg-gray-50" : ""}`}
                >
                  —
                </button>
              </li>

              {authors.map((author) => (
                <li key={author.initials}>
                  <div
                    className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${value === author.initials ? "bg-[#005698]/5" : ""}`}
                    onClick={() => handleSelect(author)}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-gray-800 mr-1.5">{author.initials}</span>
                      {author.name && (
                        <span className="text-xs text-gray-500">{author.name}</span>
                      )}
                      {author.position && (
                        <span className="text-xs text-gray-400"> · {author.position}</span>
                      )}
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => { setIsOpen(false); setFormModal(author); }}
                        className="p-1 text-gray-400 hover:text-[#005698] rounded transition-colors"
                        title="Edytuj autora"
                      >
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsOpen(false); setDeleteModal(author); }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                        title="Usuń autora"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Dodaj nowego */}
            <div className="border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setIsOpen(false); setFormModal("new"); }}
                className="w-full text-left px-3 py-2 text-xs text-[#005698] hover:bg-[#005698]/5 transition-colors"
              >
                + Dodaj autora
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mini-modal edycji / dodawania */}
      {formModal !== null && (
        <AuthorFormModal
          author={formModal === "new" ? null : formModal}
          onSave={handleFormSave}
          onClose={() => setFormModal(null)}
        />
      )}

      {/* Confirm delete */}
      <DeleteConfirmationModal
        isOpen={deleteModal !== null}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleConfirmDelete}
        title="Usuń autora"
        message={
          deleteModal
            ? `Czy na pewno chcesz usunąć inicjały ${deleteModal.initials}${deleteModal.name ? ` (${deleteModal.name})` : ""}?`
            : ""
        }
        confirmButtonText="Usuń"
      />
    </>
  );
}
