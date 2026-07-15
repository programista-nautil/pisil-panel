"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";

const TIER_LABEL = {
  CZLONEK_GRATIS: "Członek (gratis)",
  CZLONEK_PLATNY: "Członek",
  NIECZLONEK: "Nie-członek",
};
const PLATNOSC_OPTS = [
  ["ZWOLNIONY", "Zwolniony"],
  ["OCZEKUJE", "Oczekuje"],
  ["OPLACONE", "Opłacone"],
];
const REJESTRACJA_OPTS = [
  ["POTWIERDZONA", "Potwierdzona"],
  ["LISTA_REZERWOWA", "Lista rezerwowa"],
  ["ANULOWANA", "Anulowana"],
];

const formatPln = (v) => `${Number(v || 0).toFixed(2).replace(".", ",")} zł`;

const selectCls =
  "text-xs border border-gray-300 rounded px-1.5 py-1 text-gray-700 focus:outline-none focus:border-[#005698]";

export default function EventRegistrationsView({ event, onBack }) {
  const [registrations, setRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const fetchRegistrations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${event.id}/registrations`);
      if (!res.ok) throw new Error("Błąd ładowania zgłoszeń");
      setRegistrations(await res.json());
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const summary = useMemo(() => {
    const active = registrations.filter((r) => r.statusRejestracji !== "ANULOWANA");
    const potwierdzone = active.filter((r) => r.statusRejestracji === "POTWIERDZONA").length;
    const rezerwowa = active.filter((r) => r.statusRejestracji === "LISTA_REZERWOWA").length;
    const naleznosc = active
      .filter((r) => r.statusPlatnosci !== "ZWOLNIONY")
      .reduce((sum, r) => sum + Number(r.kwota || 0), 0);
    const oplacone = active
      .filter((r) => r.statusPlatnosci === "OPLACONE")
      .reduce((sum, r) => sum + Number(r.kwota || 0), 0);
    return { potwierdzone, rezerwowa, naleznosc, oplacone };
  }, [registrations]);

  const updateField = async (reg, field, value) => {
    // optymistyczna aktualizacja
    setRegistrations((prev) =>
      prev.map((r) => (r.id === reg.id ? { ...r, [field]: value } : r))
    );
    try {
      const res = await fetch(`/api/admin/events/${event.id}/registrations/${reg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error("Błąd zapisu");
    } catch (error) {
      toast.error(error.message);
      fetchRegistrations(); // przywróć stan z serwera
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/events/${event.id}/registrations/${deleting.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Błąd usuwania");
      setRegistrations((prev) => prev.filter((r) => r.id !== deleting.id));
      toast.success("Usunięto zgłoszenie.");
      setDeleting(null);
    } catch (error) {
      toast.error(error.message);
      setDeleting(null);
    }
  };

  const handleAdded = (reg) => {
    setRegistrations((prev) => [...prev, reg]);
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Nagłówek */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-800 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
            title="Powrót"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-800 truncate">{event.title}</h2>
            <p className="text-sm text-gray-500">Zgłoszenia na wydarzenie</p>
          </div>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#005698] text-white font-medium rounded-md hover:bg-[#005698]/90 transition-colors shadow-sm flex-shrink-0"
        >
          + Dopisz uczestnika
        </button>
      </div>

      {/* Podsumowanie */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Potwierdzone" value={summary.potwierdzone} />
        <StatBox label="Lista rezerwowa" value={summary.rezerwowa} />
        <StatBox label="Należność" value={formatPln(summary.naleznosc)} />
        <StatBox label="Opłacone" value={formatPln(summary.oplacone)} />
      </div>

      {/* Tabela */}
      {isLoading ? (
        <p className="text-center text-gray-500 py-8">Ładowanie zgłoszeń…</p>
      ) : registrations.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Brak zgłoszeń na to wydarzenie.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Uczestnik", "Firma / NIP", "Poziom", "Kwota", "Płatność", "Rejestracja", "Źródło", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {registrations.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-800">
                      {r.firstName} {r.lastName}
                    </div>
                    <div className="text-xs text-gray-500">{r.email}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-gray-800">{r.firmaNazwa}</div>
                    <div className="text-xs text-gray-500">{r.firmaNip}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                    {TIER_LABEL[r.tier] || r.tier}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700">{formatPln(r.kwota)}</td>
                  <td className="px-3 py-2">
                    <select
                      value={r.statusPlatnosci}
                      onChange={(e) => updateField(r, "statusPlatnosci", e.target.value)}
                      className={selectCls}
                    >
                      {PLATNOSC_OPTS.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={r.statusRejestracji}
                      onChange={(e) => updateField(r, "statusRejestracji", e.target.value)}
                      className={selectCls}
                    >
                      {REJESTRACJA_OPTS.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                    {r.zrodlo === "ADMIN" ? "Ręczne" : "Strona"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => setDeleting(r)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Usuń
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAddOpen && (
        <AddParticipantModal
          eventId={event.id}
          onClose={() => setIsAddOpen(false)}
          onAdded={handleAdded}
        />
      )}

      <DeleteConfirmationModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Usuń zgłoszenie"
        message={
          deleting ? `Czy na pewno usunąć zgłoszenie: ${deleting.firstName} ${deleting.lastName}?` : ""
        }
        confirmButtonText="Usuń"
      />
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-[#005698]">{value}</p>
    </div>
  );
}

// -------- Modal ręcznego dopisania uczestnika --------
const inputCls =
  "block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-[#005698] focus:ring-[#005698] sm:text-sm text-gray-700";

function AddParticipantModal({ eventId, onClose, onAdded }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    firmaNazwa: "",
    firmaNip: "",
    firmaAdres: "",
    notatka: "",
    zgodaRodo: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const set = (f, v) => setForm((s) => ({ ...s, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.firmaNazwa.trim()) {
      toast.error("Imię, nazwisko i nazwa firmy są wymagane.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Błąd dopisywania.");
      }
      const reg = await res.json();
      toast.success("Dopisano uczestnika. Poziom cenowy wyliczony automatycznie.");
      onAdded(reg);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-start overflow-y-auto p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-[#005698]">Dopisz uczestnika</h3>
          <p className="text-xs text-gray-500 mt-1">
            Poziom cenowy i kwota zostaną wyliczone automatycznie (po NIP wykrywamy członka).
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Imię *"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              className={inputCls}
            />
            <input
              type="text"
              placeholder="Nazwisko *"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              className={inputCls}
            />
          </div>
          <input
            type="email"
            placeholder="E-mail"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="Nazwa firmy *"
            value={form.firmaNazwa}
            onChange={(e) => set("firmaNazwa", e.target.value)}
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="NIP"
              value={form.firmaNip}
              onChange={(e) => set("firmaNip", e.target.value)}
              className={inputCls}
            />
            <input
              type="text"
              placeholder="Adres do faktury"
              value={form.firmaAdres}
              onChange={(e) => set("firmaAdres", e.target.value)}
              className={inputCls}
            />
          </div>
          <input
            type="text"
            placeholder="Notatka (opcjonalnie)"
            value={form.notatka}
            onChange={(e) => set("notatka", e.target.value)}
            className={inputCls}
          />
          {/* Zgoda RODO: osoba dopisana telefonicznie niczego nie kliknęła — rejestr zgód ma
              odzwierciedlać stan faktyczny, więc admin musi to potwierdzić świadomie. */}
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.zgodaRodo}
              onChange={(e) => set("zgodaRodo", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#005698] focus:ring-[#005698]"
            />
            <span>
              Uczestnik wyraził zgodę RODO (odebrana telefonicznie lub mailem).
              <span className="block text-xs text-gray-500">
                Niezaznaczone = w rejestrze zapiszemy brak zgody. Zgodę trzeba odebrać osobno.
              </span>
            </span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-[#005698] rounded-md hover:bg-[#005698]/90 disabled:opacity-50"
            >
              {isSaving ? "Zapisuję…" : "Dopisz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
