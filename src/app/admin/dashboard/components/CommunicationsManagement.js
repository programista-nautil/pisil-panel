"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { MegaphoneIcon, PrinterIcon } from "@heroicons/react/24/outline";
import AddCommunicationModal from "./AddCommunicationModal";
import EditCommunicationModal from "./EditCommunicationModal";
import CommunicationsByYear, {
  compareByCommunicationNumber,
} from "./CommunicationsByYear";

// ---------------------------------------------------------------------------
// Generowanie raportu HTML (otwierany w nowej karcie, do druku Ctrl+P)
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pluralKomunikat(n) {
  if (n === 1) return "komunikat";
  if (n >= 2 && n <= 4) return "komunikaty";
  return "komunikatów";
}

function padMonthReport(m) {
  return String(m).padStart(2, "0");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function generateReportHtml(items, yearFrom, yearTo) {
  const from = yearFrom ? Number(yearFrom) : null;
  const to = yearTo ? Number(yearTo) : null;

  const filtered = items.filter(
    (i) => (!from || i.year >= from) && (!to || i.year <= to),
  );

  const grouped = {};
  for (const item of filtered) {
    if (!grouped[item.year]) grouped[item.year] = [];
    grouped[item.year].push(item);
  }
  for (const year in grouped) {
    grouped[year].sort(compareByCommunicationNumber);
  }
  const sortedYears = Object.keys(grouped).sort((a, b) => b - a);

  const rangeLabel =
    from && to
      ? from === to
        ? `Rok ${from}`
        : `Lata ${from}–${to}`
      : from
        ? `Od roku ${from}`
        : to
          ? `Do roku ${to}`
          : "Wszystkie lata";

  const dateStr = new Date().toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const yearsHtml = sortedYears
    .map((year) => {
      const comms = grouped[year];
      const rows = comms
        .map((c) => {
          const numLabel =
            c.number != null
              ? `${c.number}/${padMonthReport(c.month)}/${c.year}`
              : "—";
          const sprawa = escapeHtml(c.subject || c.title || "");
          const data = formatDate(c.sentAt);
          const autor = escapeHtml(c.authorInitials || "");
          return `<tr>
  <td class="nr">${escapeHtml(numLabel)}</td>
  <td class="date">${data}</td>
  <td class="title">${sprawa}</td>
  <td class="author">${autor}</td>
</tr>`;
        })
        .join("");
      return `<div class="year-section">
  <h2>Rok ${year} <span class="count">(${comms.length})</span></h2>
  <table>
    <thead>
      <tr>
        <th class="nr">Nr</th>
        <th class="date">Data wysyłki</th>
        <th class="title">Sprawa</th>
        <th class="author">Autor</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Lista komunikatów — ${escapeHtml(rangeLabel)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#111;background:#fff;padding:24px 40px}
    .header{margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #005698}
    .org{font-size:11px;color:#6b7280;margin-bottom:2px}
    h1{font-size:17px;font-weight:700;color:#005698;margin-bottom:4px}
    .meta{font-size:11px;color:#6b7280}
    .year-section{margin-bottom:24px}
    h2{font-size:13px;font-weight:700;color:#005698;padding-bottom:4px;border-bottom:1px solid #e5e7eb;margin-bottom:6px}
    .count{font-weight:400;color:#9ca3af}
    table{width:100%;border-collapse:collapse}
    th,td{text-align:left;padding:4px 6px;line-height:1.5;border-bottom:1px solid #f3f4f6}
    th{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb}
    .nr{width:80px;white-space:nowrap;font-weight:600;color:#005698}
    .date{width:90px;white-space:nowrap;color:#6b7280}
    .title{flex:1}
    .author{width:48px;text-align:center;color:#6b7280}
    tr:last-child td{border-bottom:none}
    .no-data{color:#9ca3af;font-style:italic;margin-top:12px}
    @media print{
      body{padding:10mm 15mm;font-size:11px}
      .year-section{page-break-inside:avoid}
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="org">Polska Izba Spedycji i Logistyki</div>
    <h1>Lista komunikatów — ${escapeHtml(rangeLabel)}</h1>
    <div class="meta">Wygenerowano: ${dateStr}&nbsp;&nbsp;·&nbsp;&nbsp;Łącznie: ${filtered.length} ${pluralKomunikat(filtered.length)}</div>
  </div>
  ${yearsHtml || '<p class="no-data">Brak komunikatów dla podanego zakresu.</p>'}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Modal potwierdzenia zatwierdzenia komunikatu
// ---------------------------------------------------------------------------

function ApproveConfirmModal({ communication, isApproving, onConfirm, onCancel }) {
  if (!communication) return null;
  return (
    <div
      className="fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[#005698] mb-3">
          Zatwierdź komunikat
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Zatwierdzenie wyśle komunikat{" "}
          <span className="font-medium text-gray-800">
            „{communication.subject}"
          </span>{" "}
          na adres email oraz udostępni go w panelu członka. Zostanie mu
          przydzielony numer. Operacji nie można cofnąć.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isApproving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isApproving}
            className="px-4 py-2 text-sm font-medium text-white bg-[#005698] rounded-md hover:bg-[#005698]/80 disabled:opacity-50"
          >
            {isApproving ? "Zatwierdzam..." : "Zatwierdź"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Komponent główny
// ---------------------------------------------------------------------------

export default function CommunicationsManagement() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Edit modal
  const [editingCommunication, setEditingCommunication] = useState(null);

  // Modal potwierdzenia zatwierdzenia
  const [approvingCommunication, setApprovingCommunication] = useState(null);
  const [isApproving, setIsApproving] = useState(false);

  // Panel raportu
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");

  // Panel spisu
  const [isSpisOpen, setIsSpisOpen] = useState(false);
  const [spisYear, setSpisYear] = useState(() =>
    String(new Date().getFullYear()),
  );

  useEffect(() => {
    fetchCommunications();
  }, []);

  // Jednorazowe ustawienie domyślnego zakresu raportu po załadowaniu danych.
  const hasInitReport = useRef(false);
  useEffect(() => {
    if (hasInitReport.current || !items.length) return;
    hasInitReport.current = true;
    const years = items.map((i) => i.year);
    setReportFrom(String(Math.min(...years)));
    setReportTo(String(Math.max(...years)));
  }, [items]);

  const SPIS_CUTOFF_YEAR = 2026;

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const fromItems = items.map((i) => i.year);
    return [...new Set([...fromItems, currentYear])].sort((a, b) => b - a);
  }, [items]);

  // isSpis records po roku — do obsługi archiwalnych spisów
  const spisByYear = useMemo(() => {
    const map = {};
    for (const item of items) {
      if (item.isSpis) map[item.year] = item;
    }
    return map;
  }, [items]);

  const selectedSpisYearNum = spisYear === "all" ? null : Number(spisYear);
  const isSpisAutoYear =
    selectedSpisYearNum === null || selectedSpisYearNum >= SPIS_CUTOFF_YEAR;
  const selectedSpisRecord = selectedSpisYearNum
    ? (spisByYear[selectedSpisYearNum] ?? null)
    : null;

  const reportRangeInvalid =
    reportFrom && reportTo && Number(reportFrom) > Number(reportTo);

  const fetchCommunications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/communications");
      if (!res.ok) throw new Error("Błąd ładowania komunikatów");
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error(error);
      toast.error("Nie udało się pobrać komunikatów.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (
      !window.confirm(
        `Czy na pewno chcesz usunąć „${title}"? Plik zostanie bezpowrotnie skasowany z serwera.`,
      )
    )
      return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/communications/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Błąd podczas usuwania.");
      }

      setItems((prev) => prev.filter((c) => c.id !== id));
      toast.success("Komunikat usunięty pomyślnie.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const sortItems = (arr) =>
    [...arr].sort(
      (a, b) => b.year - a.year || new Date(b.createdAt) - new Date(a.createdAt),
    );

  // Nowy komunikat lub aktualizacja (np. po dodaniu załączników w AddModal)
  const handleUploadSuccess = (comm) => {
    setItems((prev) => {
      const exists = prev.some((c) => c.id === comm.id);
      if (exists) return prev.map((c) => (c.id === comm.id ? comm : c));
      return sortItems([comm, ...prev]);
    });
  };

  // Po zapisaniu edycji
  const handleSaved = (updated) => {
    setItems((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  // Kliknięcie "Zatwierdź" w wierszu — otwórz modal potwierdzenia
  const handleApprove = (comm) => {
    setApprovingCommunication(comm);
  };

  // Potwierdzenie w modalu — wyślij żądanie do API
  const handleConfirmApprove = async () => {
    if (!approvingCommunication) return;
    setIsApproving(true);
    try {
      const res = await fetch(
        `/api/admin/communications/${approvingCommunication.id}/approve`,
        { method: "POST" },
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Błąd zatwierdzania.");
      }
      const updated = await res.json();
      toast.success("Komunikat zatwierdzony i wysłany.");
      setItems((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
      setApprovingCommunication(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsApproving(false);
    }
  };

  const openReport = () => {
    const html = generateReportHtml(
      items,
      reportFrom || null,
      reportTo || null,
    );
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div className="space-y-6">
      {/* Nagłówek */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-lg">
            <MegaphoneIcon className="h-6 w-6 text-[#005698]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Zarządzanie Komunikatami
            </h2>
            <p className="text-sm text-gray-500">
              Twórz i zarządzaj komunikatami — zatwierdzaj, edytuj treść, dodawaj załączniki.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsReportOpen((o) => !o)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
              isReportOpen
                ? "border-[#005698] text-[#005698] bg-[#005698]/5"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <PrinterIcon className="h-4 w-4" />
            Raport
          </button>
          <button
            onClick={() => setIsSpisOpen((o) => !o)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
              isSpisOpen
                ? "border-[#005698] text-[#005698] bg-[#005698]/5"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Spis
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#005698] text-white font-medium rounded-md hover:bg-[#005698]/90 transition-colors shadow-sm"
          >
            + Utwórz komunikat
          </button>
        </div>
      </div>

      {/* Panel raportu */}
      {isReportOpen && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Generuj raport listy komunikatów
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Od roku
              </label>
              <select
                value={reportFrom}
                onChange={(e) => setReportFrom(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded text-gray-700 focus:outline-none focus:border-[#005698]"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Do roku
              </label>
              <select
                value={reportTo}
                onChange={(e) => setReportTo(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded text-gray-700 focus:outline-none focus:border-[#005698]"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            {reportRangeInvalid && (
              <p className="text-xs text-red-500 self-center">
                Rok „od" musi być ≤ rok „do".
              </p>
            )}
            <button
              onClick={openReport}
              disabled={!!reportRangeInvalid || !items.length}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#005698] text-white text-sm font-medium rounded-md hover:bg-[#005698]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PrinterIcon className="h-4 w-4" />
              Otwórz raport
            </button>
            <button
              type="button"
              onClick={() => setIsReportOpen(false)}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Panel spisu */}
      {isSpisOpen && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Spis komunikatów
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={spisYear}
              onChange={(e) => setSpisYear(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded text-gray-700 focus:outline-none focus:border-[#005698]"
            >
              <option value="all">Wszystkie</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {/* Rok >= 2026 lub "Wszystkie" — auto-generowany */}
            {isSpisAutoYear && (
              <>
                <a
                  href={`/api/admin/communications/spis${selectedSpisYearNum ? `?year=${selectedSpisYearNum}` : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                >
                  Podgląd
                </a>
                <a
                  href={`/api/admin/communications/spis/pdf${selectedSpisYearNum ? `?year=${selectedSpisYearNum}` : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1.5 bg-[#005698] text-white text-sm font-medium rounded-md hover:bg-[#005698]/90 transition-colors"
                >
                  Pobierz PDF
                </a>
              </>
            )}

            {/* Rok < 2026 — archiwalny PDF */}
            {!isSpisAutoYear && (
              selectedSpisRecord ? (
                <>
                  <a
                    href={`/api/admin/communications/${selectedSpisRecord.id}/download?inline=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Podgląd
                  </a>
                  <a
                    href={`/api/admin/communications/${selectedSpisRecord.id}/download`}
                    className="px-4 py-1.5 bg-[#005698] text-white text-sm font-medium rounded-md hover:bg-[#005698]/90 transition-colors"
                  >
                    Pobierz PDF
                  </a>
                </>
              ) : (
                <span className="text-xs text-gray-400 self-center">
                  Brak spisu dla roku {selectedSpisYearNum}.
                </span>
              )
            )}

            <button
              type="button"
              onClick={() => setIsSpisOpen(false)}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              Anuluj
            </button>
          </div>

        </div>
      )}

      <CommunicationsByYear
        items={items}
        isLoading={isLoading}
        downloadUrlBuilder={(id) => `/api/admin/communications/${id}/download`}
        attachmentDownloadUrlBuilder={(commId, aId) =>
          `/api/admin/communications/${commId}/attachments/${aId}/download`
        }
        onDelete={handleDelete}
        deletingId={deletingId}
        onEdit={(comm) => setEditingCommunication(comm)}
        onApprove={handleApprove}
        emptyMessage="Brak dodanych komunikatów. Użyj przycisku powyżej, aby dodać pierwszy."
      />

      <AddCommunicationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      <EditCommunicationModal
        communication={editingCommunication}
        isOpen={!!editingCommunication}
        onClose={() => setEditingCommunication(null)}
        onSaved={handleSaved}
      />

      <ApproveConfirmModal
        communication={approvingCommunication}
        isApproving={isApproving}
        onConfirm={handleConfirmApprove}
        onCancel={() => !isApproving && setApprovingCommunication(null)}
      />
    </div>
  );
}
