"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  DocumentIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";

const PER_PAGE = 10;
const MIN_FALLBACK_YEAR = 2010;

function padMonth(m) {
  return String(m).padStart(2, "0");
}

function extractNumber(title) {
  if (!title) return 0;
  const explicit = title.match(/nr\s*(\d+)/i);
  if (explicit) return parseInt(explicit[1], 10);
  const firstNum = title.match(/(\d+)/);
  return firstNum ? parseInt(firstNum[0], 10) : 0;
}

export function compareByCommunicationNumber(a, b) {
  // Drafty (subject != null, number == null) — na górze, posortowane po dacie tworzenia malejąco
  const aIsDraft = a.subject != null && a.number == null;
  const bIsDraft = b.subject != null && b.number == null;
  if (aIsDraft && bIsDraft) {
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  }
  if (aIsDraft) return -1;
  if (bIsDraft) return 1;
  // Nowe komunikaty z polem `number` — sortuj po numerze (malejąco).
  if (a.number != null && b.number != null) return b.number - a.number;
  if (a.number != null) return -1; // nowe przed legacy
  if (b.number != null) return 1;
  // Legacy — wyciągaj numer z tytułu.
  const numA = extractNumber(a.title);
  const numB = extractNumber(b.title);
  if (numA !== numB) return numB - numA;
  // Dla takich samych numerów: krótszy tytuł (główny plik) nad dłuższym (załącznikiem).
  if (a.title.startsWith(b.title)) return 1;
  if (b.title.startsWith(a.title)) return -1;
  return b.title.localeCompare(a.title, "pl", { numeric: true });
}

/**
 * Widok listy komunikatów pogrupowanych rocznikowo z filter barem (search + zakres lat)
 * i paginacją wewnątrz każdego rocznika. Wspólny dla panelu admina i członka.
 *
 * Props:
 *  - items: Communication[] (pełna lista, bez filtrowania)
 *  - isLoading: bool
 *  - downloadUrlBuilder: (id) => string
 *  - attachmentDownloadUrlBuilder?: (commId, aId) => string
 *  - onDelete?: (id, title) => void  (gdy podane, pokazujemy przycisk usuń — tylko dla szkiców)
 *  - deletingId?: string  (id w trakcie usuwania — dezaktywuje przycisk)
 *  - onEdit?: (comm) => void  (gdy podane, pokazujemy przycisk Edytuj — tylko admin)
 *  - onApprove?: (comm) => void  (gdy podane, pokazujemy przycisk Zatwierdź — tylko dla szkiców)
 *  - emptyMessage?: string
 */
export default function CommunicationsByYear({
  items,
  isLoading,
  downloadUrlBuilder,
  attachmentDownloadUrlBuilder,
  onDelete,
  deletingId,
  onEdit,
  onApprove,
  emptyMessage = "Brak komunikatów.",
}) {
  const [search, setSearch] = useState("");
  const [yearRange, setYearRange] = useState(null); // null | [from, to]
  const [collapsed, setCollapsed] = useState(() => new Set()); // Set<year> — inicjalizowane poniżej po załadowaniu items
  const [pagePerYear, setPagePerYear] = useState({}); // {year: pageNumber}

  // Jednorazowo: po załadowaniu danych zwiń wszystkie roczniki oprócz najnowszego.
  const hasInitializedCollapsed = useRef(false);
  useEffect(() => {
    if (hasInitializedCollapsed.current || items.length === 0) return;
    hasInitializedCollapsed.current = true;
    const newestYear = Math.max(...items.map((i) => i.year));
    setCollapsed(
      new Set(
        items
          .map((i) => String(i.year))
          .filter((y) => Number(y) !== newestYear),
      ),
    );
  }, [items]);

  const { minYear, maxYear } = useMemo(() => {
    if (!items.length) {
      const now = new Date().getFullYear();
      return { minYear: MIN_FALLBACK_YEAR, maxYear: now };
    }
    const years = items.map((i) => i.year);
    return { minYear: Math.min(...years), maxYear: Math.max(...years) };
  }, [items]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((item) => {
      if (s) {
        const inTitle = item.title?.toLowerCase().includes(s);
        const inSubject = item.subject?.toLowerCase().includes(s);
        const inNumber =
          item.number != null &&
          `${item.number}/${padMonth(item.month)}/${item.year}`.includes(s);
        if (!inTitle && !inSubject && !inNumber) return false;
      }
      if (yearRange) {
        const [from, to] = yearRange;
        if (item.year < from || item.year > to) return false;
      }
      return true;
    });
  }, [items, search, yearRange]);

  const grouped = useMemo(() => {
    const map = {};
    for (const item of filtered) {
      if (!map[item.year]) map[item.year] = [];
      map[item.year].push(item);
    }
    for (const year in map) {
      map[year].sort(compareByCommunicationNumber);
    }
    return map;
  }, [filtered]);

  const sortedYears = useMemo(
    () => Object.keys(grouped).sort((a, b) => b - a),
    [grouped],
  );

  useEffect(() => {
    setPagePerYear((prev) => {
      const next = {};
      for (const y of sortedYears) {
        const current = prev[y] || 1;
        const maxPage = Math.max(
          Math.ceil((grouped[y]?.length || 0) / PER_PAGE),
          1,
        );
        next[y] = Math.min(current, maxPage);
      }
      return next;
    });
  }, [sortedYears, grouped]);

  const isFilterActive = search.trim().length > 0 || yearRange !== null;

  const clearFilters = () => {
    setSearch("");
    setYearRange(null);
  };

  const toggleYear = (year) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const isExpanded = (year) => !collapsed.has(year);

  const goPage = (year, page) =>
    setPagePerYear((prev) => ({ ...prev, [year]: page }));

  return (
    <div className="space-y-4">
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        yearRange={yearRange}
        onYearRangeChange={setYearRange}
        minYear={minYear}
        maxYear={maxYear}
        isFilterActive={isFilterActive}
        onClear={clearFilters}
        totalResults={filtered.length}
      />

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Ładowanie komunikatów...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            {emptyMessage}
          </div>
        ) : sortedYears.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Brak wyników dla podanych filtrów.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sortedYears.map((year) => {
              const yearComms = grouped[year];
              const page = pagePerYear[year] || 1;
              const maxPage = Math.max(
                Math.ceil(yearComms.length / PER_PAGE),
                1,
              );
              const pageItems = yearComms.slice(
                (page - 1) * PER_PAGE,
                page * PER_PAGE,
              );
              const expanded = isExpanded(year);

              return (
                <div key={year} className="bg-white">
                  <button
                    type="button"
                    onClick={() => toggleYear(year)}
                    className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors focus:outline-none border-b border-gray-200"
                  >
                    <span className="text-base font-semibold text-[#005698]">
                      Rok {year}
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                        {yearComms.length}
                      </span>
                    </span>
                    {expanded ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>

                  {expanded && (
                    <div>
                      <ul className="divide-y divide-gray-100">
                        {pageItems.map((comm) => (
                          <CommunicationRow
                            key={comm.id}
                            comm={comm}
                            downloadUrl={downloadUrlBuilder(comm.id)}
                            attachmentDownloadUrlBuilder={
                              attachmentDownloadUrlBuilder
                            }
                            onDelete={onDelete}
                            deletingId={deletingId}
                            onEdit={onEdit}
                            onApprove={onApprove}
                          />
                        ))}
                      </ul>

                      {maxPage > 1 && (
                        <YearPagination
                          page={page}
                          maxPage={maxPage}
                          total={yearComms.length}
                          onChange={(p) => goPage(year, p)}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterBar({
  search,
  onSearchChange,
  yearRange,
  onYearRangeChange,
  minYear,
  maxYear,
  isFilterActive,
  onClear,
  totalResults,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Szukaj w tytule…"
          className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-100 border border-transparent rounded-full text-gray-700 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-gray-300"
        />
      </div>

      <YearRangePill
        value={yearRange}
        minYear={minYear}
        maxYear={maxYear}
        onChange={onYearRangeChange}
      />

      {isFilterActive && (
        <>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100"
            title="Wyczyść filtry"
          >
            <XMarkIcon className="h-4 w-4" />
            Wyczyść
          </button>
          <span className="ml-auto text-xs text-gray-500">
            Znaleziono: <strong>{totalResults}</strong>
          </span>
        </>
      )}
    </div>
  );
}

function YearRangePill({ value, minYear, maxYear, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const escHandler = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [isOpen]);

  const years = useMemo(() => {
    const out = [];
    for (let y = maxYear; y >= minYear; y--) out.push(y);
    return out;
  }, [minYear, maxYear]);

  const [from, to] = value || [minYear, maxYear];
  const label = value ? `${from} — ${to}` : "Wszystkie lata";

  const updateFrom = (newFrom) => {
    const f = Number(newFrom);
    const t = value ? Math.max(f, value[1]) : Math.max(f, maxYear);
    onChange([f, t]);
  };
  const updateTo = (newTo) => {
    const t = Number(newTo);
    const f = value ? Math.min(value[0], t) : Math.min(minYear, t);
    onChange([f, t]);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-colors ${
          value
            ? "bg-[#005698]/10 text-[#005698] hover:bg-[#005698]/15"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        <CalendarDaysIcon className="h-4 w-4" />
        <span>{label}</span>
        <ChevronDownIcon className="h-3 w-3" />
      </button>
      {isOpen && (
        <div className="absolute z-20 mt-1 left-0 sm:left-auto sm:right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-56">
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Od roku
              </label>
              <select
                value={from}
                onChange={(e) => updateFrom(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#005698] text-gray-600"
              >
                {years.map((y) => (
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
                value={to}
                onChange={(e) => updateTo(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#005698] text-gray-600"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className="w-full text-xs text-gray-500 hover:text-gray-800 pt-1 text-center"
              >
                Wyczyść zakres
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CommunicationRow({
  comm,
  downloadUrl,
  attachmentDownloadUrlBuilder,
  onDelete,
  deletingId,
  onEdit,
  onApprove,
}) {
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(false);
  const isDeleting = deletingId === comm.id;
  const displayTitle = comm.subject || comm.title;
  const hasAttachments = (comm.attachments?.length || 0) > 0;

  // ── Zgłoszenie członkowskie (isSubmission=true) — wyszarzone, tylko odczyt ─
  if (comm.isSubmission) {
    const numLabel =
      comm.number != null
        ? `${comm.number}/${padMonth(comm.month)}/${comm.year}`
        : null;
    const effectiveDownloadUrl = comm.downloadUrl;

    return (
      <li className="hover:bg-gray-50 transition-colors opacity-70">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 flex items-center gap-3">
            {numLabel ? (
              <span
                className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-gray-100 text-gray-500 whitespace-nowrap"
                title="Numer komunikatu"
              >
                {numLabel}
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600 truncate" title={comm.subject}>
                {comm.subject}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Zgłoszenie członkowskie</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {effectiveDownloadUrl && (
              <a
                href={effectiveDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-[#005698] hover:bg-[#005698]/10 rounded-md transition-colors"
                title="Otwórz zgłoszenie"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </a>
            )}
            {hasAttachments && (
              <button
                type="button"
                onClick={() => setAttachmentsExpanded((v) => !v)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title={attachmentsExpanded ? "Zwiń załączniki" : "Rozwiń załączniki"}
              >
                <PaperClipIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
        {attachmentsExpanded && hasAttachments && (
          <ul className="px-4 pb-3 pt-0 space-y-1 bg-gray-50 border-t border-gray-100">
            {comm.attachments.map((att) => (
              <li key={att.id} className="flex items-center gap-2 py-1.5">
                <PaperClipIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600 flex-1 truncate">{att.fileName}</span>
                {att.downloadUrl && (
                  <a
                    href={att.downloadUrl}
                    className="p-1.5 text-[#005698] hover:bg-[#005698]/10 rounded transition-colors flex-shrink-0"
                    title="Pobierz załącznik"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  // ── Nowy komunikat (comm.subject != null) — SZKIC lub WYSŁANY ────────────
  if (comm.subject != null) {
    const isSent = comm.status === "SENT";
    const numLabel =
      comm.number != null
        ? `${comm.number}/${padMonth(comm.month)}/${comm.year}`
        : null;

    return (
      <li className="hover:bg-gray-50 transition-colors">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 flex items-center gap-3">
            {numLabel ? (
              <span
                className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-[#005698]/10 text-[#005698] whitespace-nowrap"
                title="Numer komunikatu"
              >
                {numLabel}
              </span>
            ) : (
              <span className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-gray-100 text-gray-500 whitespace-nowrap">
                SZKIC
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate" title={displayTitle}>
                {displayTitle}
              </p>
              {comm.authorInitials && (
                <p className="text-xs text-gray-500 mt-0.5">{comm.authorInitials}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onEdit && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                  isSent
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {isSent ? "WYSŁANY" : "SZKIC"}
              </span>
            )}
            {onApprove && !isSent && (
              <button
                type="button"
                onClick={() => onApprove(comm)}
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                title="Zatwierdź komunikat"
              >
                <CheckCircleIcon className="h-5 w-5" />
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(comm)}
                className="p-2 text-gray-500 hover:text-[#005698] hover:bg-[#005698]/10 rounded-md transition-colors"
                title="Edytuj komunikat"
              >
                <PencilSquareIcon className="h-5 w-5" />
              </button>
            )}
            {comm.filePath && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-[#005698] hover:bg-[#005698]/10 rounded-md transition-colors"
                title="Otwórz w nowej karcie"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </a>
            )}
            {hasAttachments && (
              <button
                type="button"
                onClick={() => setAttachmentsExpanded((v) => !v)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title={attachmentsExpanded ? "Zwiń załączniki" : "Rozwiń załączniki"}
              >
                <PaperClipIcon className="h-5 w-5" />
              </button>
            )}
            {onDelete && !isSent && (
              <button
                type="button"
                onClick={() => onDelete(comm.id, displayTitle)}
                disabled={isDeleting}
                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                title="Usuń komunikat"
              >
                {isDeleting ? (
                  <span className="text-xs text-gray-400">...</span>
                ) : (
                  <TrashIcon className="h-5 w-5" />
                )}
              </button>
            )}
          </div>
        </div>
        {attachmentsExpanded && hasAttachments && (
          <ul className="px-4 pb-3 pt-0 space-y-1 bg-gray-50 border-t border-gray-100">
            {comm.attachments.map((att) => (
              <li key={att.id} className="flex items-center gap-2 py-1.5">
                <PaperClipIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 flex-1 truncate">
                  {att.fileName}
                </span>
                {attachmentDownloadUrlBuilder && (
                  <a
                    href={attachmentDownloadUrlBuilder(comm.id, att.id)}
                    className="p-1.5 text-[#005698] hover:bg-[#005698]/10 rounded transition-colors flex-shrink-0"
                    title="Pobierz załącznik"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  // ── Spis (isSpis=true, archiwalne) ───────────────────────────────────────
  if (comm.isSpis) {
    return (
      <li className="flex items-center justify-between gap-3 px-4 py-3 border-l-4 border-blue-400 bg-blue-50/40 hover:bg-blue-50 transition-colors">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <ClipboardDocumentListIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate" title={comm.title}>
              {comm.title}
            </p>
            {comm.fileName && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{comm.fileName}</p>
            )}
          </div>
          <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            SPIS
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {comm.filePath && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-[#005698] hover:bg-[#005698]/10 rounded-md transition-colors"
              title="Otwórz w nowej karcie"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
            </a>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(comm.id, comm.title)}
              disabled={isDeleting}
              className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
              title="Usuń spis"
            >
              {isDeleting ? (
                <span className="text-xs text-gray-400">...</span>
              ) : (
                <TrashIcon className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      </li>
    );
  }

  // ── Legacy (archiwalny plik, number=null, isSpis=false) ──────────────────
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="min-w-0 flex-1 flex items-center gap-3">
        <DocumentIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate" title={comm.title}>
            {comm.title}
          </p>
          <p className="text-xs text-gray-500 truncate mt-0.5" title={comm.fileName}>
            {comm.fileName}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {comm.filePath && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-[#005698] hover:bg-[#005698]/10 rounded-md transition-colors"
            title="Otwórz w nowej karcie"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
          </a>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(comm.id, comm.title)}
            disabled={isDeleting}
            className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
            title="Usuń komunikat"
          >
            {isDeleting ? (
              <span className="text-xs text-gray-400">...</span>
            ) : (
              <TrashIcon className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
    </li>
  );
}

function YearPagination({ page, maxPage, total, onChange }) {
  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-500">
      <span>
        Strona <strong>{page}</strong> z <strong>{maxPage}</strong> ({total})
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
          title="Poprzednia"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(maxPage, page + 1))}
          disabled={page >= maxPage}
          className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
          title="Następna"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
