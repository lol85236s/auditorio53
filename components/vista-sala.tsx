"use client";

import React, { useEffect, useState } from "react";

type Asiento = {
  asientoId: string;
  numero_asiento: number;
  numeroAsiento: number;
  fila: string | null;
  seccion: string | null;
  ocupado: boolean;
  registroId?: string | null;
  numero_orden?: number | null;
  asistente?: {
    id: string;
    nombre: string | null;
    email: string | null;
  } | null;
};

type Fila = {
  fila: string;
  seats: Asiento[];
};

export function VistaSala({ eventoId }: { eventoId: string }) {
  const [grid, setGrid] = useState<Fila[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/asientos/evento/${eventoId}/grid`);
        const json = await res.json();
        if (!mounted) return;
        if (!res.ok) {
          setError(json.error || "Error cargando grid");
          setGrid([]);
        } else {
          setGrid(json.grid || []);
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || "Error de red");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [eventoId]);

  if (loading) return <div>Cargando sala...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!grid) return <div>No hay datos de la sala.</div>;

  // Flatten asistentes para búsqueda simple
  const asistentesFlat: { asiento: Asiento; fila: string }[] = [];
  grid.forEach((f) =>
    f.seats.forEach((s) => asistentesFlat.push({ asiento: s, fila: f.fila }))
  );

  const filteredAsistentes = filter
    ? asistentesFlat.filter((a) =>
        `${a.asiento.asistente?.nombre || ""} ${
          a.asiento.asistente?.email || ""
        }`
          .toLowerCase()
          .includes(filter.toLowerCase())
      )
    : asistentesFlat;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="px-3 py-2 border rounded-lg w-full"
        />
      </div>

      <div className="space-y-6">
        {grid.map((fila) => (
          <div key={fila.fila}>
            <h4 className="font-semibold mb-2">Fila: {fila.fila || "-"}</h4>
            <div className="flex flex-wrap gap-2">
              {fila.seats.map((s) => {
                const isMatch =
                  !filter ||
                  `${s.asistente?.nombre || ""} ${s.asistente?.email || ""}`
                    .toLowerCase()
                    .includes(filter.toLowerCase());

                return (
                  <div
                    key={s.asientoId}
                    className={`w-28 p-2 rounded-lg shadow-sm border flex flex-col items-start gap-1 transition-opacity ${
                      s.ocupado
                        ? "bg-red-50 border-red-200"
                        : "bg-green-50 border-green-200"
                    } ${isMatch ? "opacity-100" : "opacity-40"}`}
                    title={
                      s.asistente
                        ? `${s.asistente.nombre} <${s.asistente.email}>`
                        : "Libre"
                    }
                  >
                    <div className="text-sm font-medium">
                      Asiento {s.numero_asiento}
                    </div>
                    <div className="text-xs text-gray-600">
                      Sección: {s.seccion || "-"}
                    </div>
                    <div className="text-xs text-gray-700">
                      {s.ocupado ? (
                        <>
                          <div className="font-medium">
                            {s.asistente?.nombre || "-"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {s.asistente?.email || ""}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-green-700">Libre</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h5 className="font-semibold mb-2">
          Resultados coincidentes: {filteredAsistentes.length}
        </h5>
        <div className="max-h-48 overflow-auto border rounded-md p-2 bg-white">
          {filteredAsistentes.map((f) => (
            <div
              key={f.asiento.asientoId}
              className="py-1 border-b last:border-b-0"
            >
              <div className="text-sm font-medium">
                Asiento {f.asiento.numero_asiento} — Fila {f.fila}
              </div>
              <div className="text-xs text-gray-600">
                {f.asiento.asistente?.nombre || "(vacío)"} —{" "}
                {f.asiento.asistente?.email || ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VistaSala;
