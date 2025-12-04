"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import type { Reserva } from "@/app/page";

type PropiedadesVistaCalendario = {
  reservas: Reserva[];
  fechaSeleccionada: Date;
  alCambiarFecha: (fecha: Date) => void;
};

export function Calendario({
  reservas,
  fechaSeleccionada,
  alCambiarFecha,
}: PropiedadesVistaCalendario) {
  const horas = Array.from({ length: 10 }, (_, i) => i + 7); // 7 AM a 4 PM

  const formatearFechaLocal = (fecha: Date) => {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const obtenerFechaMinima = () => {
    const ahora = new Date();
    const horaActual = ahora.getHours();

    // Si son las 4 PM o después, la fecha mínima es mañana
    if (horaActual >= 16) {
      const manana = new Date(ahora);
      manana.setDate(manana.getDate() + 1);
      return formatearFechaLocal(manana);
    }

    // Si es antes de las 4 PM, puede ser hoy
    return formatearFechaLocal(ahora);
  };

  const cambiarFecha = (dias: number) => {
    const nuevaFecha = new Date(fechaSeleccionada);
    nuevaFecha.setDate(nuevaFecha.getDate() + dias);

    // Validar que no vaya a una fecha menor que la fecha mínima
    const fechaMinima = obtenerFechaMinima();
    const fechaNuevaFormato = formatearFechaLocal(nuevaFecha);

    if (fechaNuevaFormato >= fechaMinima) {
      alCambiarFecha(nuevaFecha);
    }
  };

  const obtenerReservasParaRanura = (auditorio: "A" | "B", hora: number) => {
    return reservas.filter((reserva) => {
      if (reserva.auditorio !== auditorio) return false;

      const fechaReserva = reserva.fecha;
      const fechaSelec = formatearFechaLocal(fechaSeleccionada);
      if (fechaReserva !== fechaSelec) return false;

      const [horaInicio] = reserva.horaInicio.split(":").map(Number);
      return horaInicio === hora;
    });
  };

  const formatearFecha = (fecha: Date) => {
    return fecha.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const esHoy = fechaSeleccionada.toDateString() === new Date().toDateString();

  return (
    <Card className="p-6 rounded-2xl shadow-xl bg-white/80 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-200">
        <Button
          variant="outline"
          size="icon"
          onClick={() => cambiarFecha(-1)}
          className="rounded-lg shadow-md hover:shadow-lg hover:bg-linear-to-b hover:from-blue-500 hover:to-blue-600 hover:text-white hover:border-blue-600 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold capitalize">
            {formatearFecha(fechaSeleccionada)}
            {esHoy && (
              <span className="ml-2 text-sm bg-linear-to-r from-blue-500 to-cyan-500 text-white px-3 py-1 rounded-full shadow-md">
                Hoy
              </span>
            )}
          </h2>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => cambiarFecha(1)}
          className="rounded-lg shadow-md hover:shadow-lg hover:bg-linear-to-b hover:from-blue-500 hover:to-blue-600 hover:text-white hover:border-blue-600 transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-[100px_1fr_1fr] gap-3 mb-3">
            <div className="font-semibold text-sm text-gray-600">Hora</div>
            <div className="font-semibold text-sm text-center bg-linear-to-b from-blue-500 to-blue-600 text-white py-3 rounded-lg shadow-md">
              Auditorio A
            </div>
            <div className="font-semibold text-sm text-center bg-linear-to-b from-purple-500 to-purple-600 text-white py-3 rounded-lg shadow-md">
              Auditorio B
            </div>
          </div>

          <div className="space-y-2">
            {horas.map((hora) => {
              const reservasA = obtenerReservasParaRanura("A", hora);
              const reservasB = obtenerReservasParaRanura("B", hora);

              return (
                <div
                  key={hora}
                  className="grid grid-cols-[100px_1fr_1fr] gap-3"
                >
                  <div className="text-sm font-medium py-4 flex items-center text-gray-600">
                    {hora.toString().padStart(2, "0")}:00
                  </div>

                  <div
                    className={`min-h-[70px] rounded-lg p-2 transition-all ${
                      reservasA.length > 0
                        ? "bg-blue-50"
                        : "bg-white hover:bg-blue-50/50 shadow-sm"
                    }`}
                  >
                    {reservasA.length > 0 ? (
                      reservasA.map((reserva) => (
                        <div
                          key={reserva.id}
                          className="bg-linear-to-b from-blue-500 to-blue-600 text-white p-3 rounded-lg h-full shadow-md"
                        >
                          <p className="font-semibold truncate text-sm">
                            {reserva.titulo}
                          </p>
                          <p className="truncate text-xs mt-1 text-white/90">
                            {reserva.organizador}
                          </p>
                          <p className="text-xs mt-1 text-white/80">
                            {reserva.horaInicio} - {reserva.horaFin}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs font-medium text-gray-400">
                        Libre
                      </div>
                    )}
                  </div>

                  <div
                    className={`min-h-[70px] rounded-lg p-2 transition-all ${
                      reservasB.length > 0
                        ? "bg-purple-50"
                        : "bg-white hover:bg-purple-50/50 shadow-sm"
                    }`}
                  >
                    {reservasB.length > 0 ? (
                      reservasB.map((reserva) => (
                        <div
                          key={reserva.id}
                          className="bg-linear-to-b from-purple-500 to-purple-600 text-white p-3 rounded-lg h-full shadow-md"
                        >
                          <p className="font-semibold truncate text-sm">
                            {reserva.titulo}
                          </p>
                          <p className="truncate text-xs mt-1 text-white/90">
                            {reserva.organizador}
                          </p>
                          <p className="text-xs mt-1 text-white/80">
                            {reserva.horaInicio} - {reserva.horaFin}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs font-medium text-gray-400">
                        Libre
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
