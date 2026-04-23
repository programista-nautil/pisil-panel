"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MegaphoneIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import CommunicationsByYear from "./CommunicationsByYear";

const SPIS_CUTOFF_YEAR = 2026;

export default function CommunicationsSection() {
  const [communications, setCommunications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMainOpen, setIsMainOpen] = useState(false);
  const [spisYear, setSpisYear] = useState(() => String(new Date().getFullYear()));

  useEffect(() => {
    const fetchCommunications = async () => {
      try {
        const res = await fetch("/api/member/communications");
        if (res.ok) {
          const data = await res.json();
          setCommunications(data);
        }
      } catch (error) {
        console.error("Błąd pobierania komunikatów", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCommunications();
  }, []);

  const availableYears = useMemo(() => {
    if (!communications.length) return [];
    return [...new Set(communications.map((c) => c.year))].sort((a, b) => b - a);
  }, [communications]);

  const spisByYear = useMemo(() => {
    return communications
      .filter((c) => c.isSpis)
      .reduce((acc, c) => {
        acc[c.year] = c;
        return acc;
      }, {});
  }, [communications]);

  const selectedSpisYearNum = spisYear !== "all" ? Number(spisYear) : null;
  const isSpisAutoYear =
    !selectedSpisYearNum || selectedSpisYearNum >= SPIS_CUTOFF_YEAR;
  const selectedSpisRecord = selectedSpisYearNum
    ? spisByYear[selectedSpisYearNum]
    : null;

  const regularCommunications = useMemo(
    () => communications.filter((c) => !c.isSpis),
    [communications],
  );

  return (
    <section className="mb-8">
      <div
        onClick={() => setIsMainOpen(!isMainOpen)}
        className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <MegaphoneIcon className="h-6 w-6 text-[#005698]" />
          <h2 className="text-lg font-semibold text-[#005698]">Komunikaty</h2>
        </div>
        {isMainOpen ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        )}
      </div>

      {isMainOpen && (
        <div className="mt-2 pl-4 border-l-4 border-l-[#005698] space-y-3">
          {/* Spis komunikatów */}
          <div className="py-2 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">
                Spis komunikatów:
              </span>
              <select
                value={spisYear}
                onChange={(e) => setSpisYear(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded text-gray-700 focus:outline-none focus:border-[#005698]"
              >
                <option value="all">Wszystkie lata</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              {isSpisAutoYear ? (
                <>
                  <a
                    href={`/api/member/communications/spis${selectedSpisYearNum ? `?year=${selectedSpisYearNum}` : ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                  >
                    Podgląd
                  </a>
                  <a
                    href={`/api/member/communications/spis/pdf${selectedSpisYearNum ? `?year=${selectedSpisYearNum}` : ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-sm bg-[#005698] text-white rounded hover:bg-[#005698]/90 transition-colors"
                  >
                    Pobierz PDF
                  </a>
                </>
              ) : selectedSpisRecord ? (
                <>
                  <a
                    href={`/api/member/communications/${selectedSpisRecord.id}/download?inline=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                  >
                    Podgląd
                  </a>
                  <a
                    href={`/api/member/communications/${selectedSpisRecord.id}/download`}
                    className="px-3 py-1 text-sm bg-[#005698] text-white rounded hover:bg-[#005698]/90 transition-colors"
                  >
                    Pobierz PDF
                  </a>
                </>
              ) : (
                <span className="text-sm text-gray-400 italic">
                  Brak spisu dla roku {selectedSpisYearNum}.
                </span>
              )}
            </div>

          </div>

          <CommunicationsByYear
            items={regularCommunications}
            isLoading={isLoading}
            downloadUrlBuilder={(id) =>
              `/api/member/communications/${id}/download`
            }
            attachmentDownloadUrlBuilder={(commId, aId) =>
              `/api/member/communications/${commId}/attachments/${aId}/download`
            }
            showAuthorInitials={false}
            emptyMessage="Brak komunikatów."
          />
        </div>
      )}
    </section>
  );
}
