"use client";

import NewslettersSection from "@/app/member/dashboard/components/NewslettersSection";
import ReportsSection from "@/app/member/dashboard/components/ReportsSection";
import CommunicationsSection from "./CommunicationsSection";

export default function AdminResourcesTab() {
  return (
    <div className="space-y-6 p-2 sm:p-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Materiały PISiL
        </h2>
        <p className="text-sm text-gray-500 mb-6 border-b pb-4">
          Poniżej znajduje się podgląd sekcji komunikatów, newsletterów i
          sprawozdań. Dokładnie ten sam widok jest prezentowany zalogowanym
          członkom w ich panelu.
        </p>
      </div>

      <CommunicationsSection />
      <NewslettersSection />
      <ReportsSection />
    </div>
  );
}
