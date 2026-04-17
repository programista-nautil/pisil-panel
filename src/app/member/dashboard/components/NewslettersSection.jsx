"use client";

import { useState } from "react";
import {
  EnvelopeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { CollapsibleFileCategory } from "./CollapsibleFileCategory";

export default function NewslettersSection() {
  const [isMainOpen, setIsMainOpen] = useState(false);

  const years = Array.from({ length: 2025 - 2018 + 1 }, (_, i) => 2025 - i);

  const newsletterFiles = years.map((year) => ({
    id: `newsletter-${year}`,
    fileName: `spis-newsletterow-${year}.pdf`,
    downloadUrl: `/api/member/resources/newsletter/spis-newsletterow-${year}.pdf`,
  }));

  const newsletterCategory = {
    category: "Spisy newsletterów",
    files: newsletterFiles,
  };

  return (
    <section className="mb-8">
      <div
        onClick={() => setIsMainOpen(!isMainOpen)}
        className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <EnvelopeIcon className="h-6 w-6 text-[#005698]" />
          <h2 className="text-lg font-semibold text-[#005698]">
            Spisy Newsletterów
          </h2>
        </div>
        {isMainOpen ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        )}
      </div>

      {isMainOpen && (
        <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden pl-4 border-l-4 border-l-[#005698]">
          <CollapsibleFileCategory category={newsletterCategory} />
        </div>
      )}
    </section>
  );
}
