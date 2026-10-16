"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { PropertyCard } from "./PropertyCard";

const pageSizeOptions = [3, 6, 9, 12];

export function PropertyList({ properties }: { properties: any[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const totalPages = Math.max(1, Math.ceil(properties.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [properties, pageSize]);

  const current = properties.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section id="annonces" className="scroll-mt-20 bg-background py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-gold-foreground">
              Nos biens
            </span>
            <h2 className="mt-1 font-display text-3xl font-bold text-foreground">
              Annonces récentes
            </h2>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Afficher par
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-ring"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        {current.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-muted-foreground">
            <SearchX className="size-10" />
            <p className="font-medium">
              Aucune annonce ne correspond à votre recherche.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {current.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex size-10 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`flex size-10 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                  n === page
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-foreground hover:bg-secondary"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex size-10 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}