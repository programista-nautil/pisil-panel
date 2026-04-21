"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { MegaphoneIcon, PrinterIcon } from "@heroicons/react/24/outline";
import AddCommunicationModal from "./AddCommunicationModal";
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
        .map(
          (c, i) =>
            `<li><span class="num">${i + 1}.</span><span class="title">${escapeHtml(c.title)}</span></li>`,
        )
        .join("");
      return `<div class="year-section">
  <h2>Rok ${year} <span class="count">(${comms.length})</span></h2>
  <ul>${rows}</ul>
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
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#111;background:#fff;padding:24px 40px}
    .header{margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #005698}
    .org{font-size:11px;color:#6b7280;margin-bottom:2px}
    h1{font-size:18px;font-weight:700;color:#005698;margin-bottom:4px}
    .meta{font-size:11px;color:#6b7280}
    .year-section{margin-bottom:20px}
    h2{font-size:13px;font-weight:700;color:#005698;padding-bottom:4px;border-bottom:1px solid #e5e7eb;margin-bottom:8px}
    .count{font-weight:400;color:#9ca3af}
    ul{list-style:none}
    li{display:flex;gap:8px;padding:2px 0;line-height:1.5}
    .num{color:#9ca3af;min-width:28px;flex-shrink:0;text-align:right}
    .title{flex:1}
    .no-data{color:#9ca3af;font-style:italic;margin-top:12px}
    @media print{
      body{padding:10mm 15mm}
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
// Komponent główny
// ---------------------------------------------------------------------------

export default function CommunicationsManagement() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Panel raportu
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");

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

  const availableYears = useMemo(() => {
    if (!items.length) return [];
    return [...new Set(items.map((i) => i.year))].sort((a, b) => b - a);
  }, [items]);

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
        `Czy na pewno chcesz usunąć "${title}"? Plik zostanie bezpowrotnie skasowany z serwera.`,
      )
    )
      return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/communications/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Błąd podczas usuwania");

      setItems((prev) => prev.filter((c) => c.id !== id));
      toast.success("Komunikat usunięty pomyślnie.");
    } catch (error) {
      console.error(error);
      toast.error("Nie udało się usunąć komunikatu.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUploadSuccess = (newCommunication) => {
    toast.success("Komunikat dodany pomyślnie!");
    setItems((prev) =>
      [newCommunication, ...prev].sort(
        (a, b) =>
          b.year - a.year || new Date(b.createdAt) - new Date(a.createdAt),
      ),
    );
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
              Dodawaj pliki, które będą widoczne w panelu członka.
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
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#005698] text-white font-medium rounded-md hover:bg-[#005698]/90 transition-colors shadow-sm"
          >
            + Dodaj komunikat
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

      <CommunicationsByYear
        items={items}
        isLoading={isLoading}
        downloadUrlBuilder={(id) => `/api/admin/communications/${id}/download`}
        onDelete={handleDelete}
        deletingId={deletingId}
        emptyMessage="Brak dodanych komunikatów. Użyj przycisku powyżej, aby dodać pierwszy."
      />

      <AddCommunicationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
