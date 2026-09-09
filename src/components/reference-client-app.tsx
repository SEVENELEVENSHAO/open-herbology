"use client";

import { useEffect, useState } from "react";
import { ReferenceApp } from "@/components/reference-app";
import { LocaleProvider, useLocale } from "@/lib/locale-context";
import type { ReferenceData } from "@/types/reference";

function ReferenceLibrary() {
  const { locale, t } = useLocale();
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);

  useEffect(() => {
    let cancelled = false;

    import("@/lib/reference-data").then(({ getReferenceData }) => {
      if (!cancelled) setReferenceData(getReferenceData(locale));
    });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (!referenceData) {
    return (
      <main className="loading-shell">
        <strong>Open Herbology</strong>
        <span>{t.loading}</span>
      </main>
    );
  }

  return <ReferenceApp data={referenceData} />;
}

export function ReferenceClientApp() {
  return (
    <LocaleProvider>
      <ReferenceLibrary />
    </LocaleProvider>
  );
}
