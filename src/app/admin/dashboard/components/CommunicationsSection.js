"use client";

import { useState, useEffect } from "react";
import {
  MegaphoneIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import CommunicationsByYear from "./CommunicationsByYear";

export default function CommunicationsSection() {
  const [communications, setCommunications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMainOpen, setIsMainOpen] = useState(false);

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
        <div className="mt-2 pl-4 border-l-4 border-l-[#005698]">
          <CommunicationsByYear
            items={communications}
            isLoading={isLoading}
            downloadUrlBuilder={(id) =>
              `/api/member/communications/${id}/download`
            }
            emptyMessage="Brak komunikatów."
          />
        </div>
      )}
    </section>
  );
}
