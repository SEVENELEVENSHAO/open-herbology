"use client";

import { useEffect, useState } from "react";
import { ReferenceApp } from "@/components/reference-app";
import type { ReferenceData } from "@/types/reference";

export function ReferenceClientApp() {
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);

  useEffect(() => {
    let cancelled = false;

    import("@/lib/reference-data").then(({ getReferenceData }) => {
      if (!cancelled) setReferenceData(getReferenceData());
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!referenceData) {
    return (
      <main className="loading-shell">
        <strong>Open Herbology</strong>
        <span>正在加载资料库…</span>
      </main>
    );
  }

  return <ReferenceApp data={referenceData} />;
}
