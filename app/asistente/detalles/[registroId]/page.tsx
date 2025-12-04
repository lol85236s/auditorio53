"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Armchair,
  CalendarIcon,
  Clock,
  MapPin,
  Home,
} from "lucide-react";
import Link from "next/link";

type DetallesAsiento = {
  id: string;
  nombre: string;
  email: string;
  numeroAsiento: number;
  evento: {
    id: string;
    titulo: string;
    organizador: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    auditorio: string;
    descripcion?: string;
  };
};

export default function DetallesAsientoPage() {
  const params = useParams();
  const registroId = params.registroId as string;

  const [detalles, setDetalles] = useState<DetallesAsiento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!registroId) return;

    let mounted = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/registros-asistentes/detalles/${registroId}`
        );
        const data = await res.json();

        if (!mounted) return;

        if (res.ok && data.success) {
          setDetalles(data.detalles);
        } else {
          setError(data.error || "No se pudieron cargar los detalles");
        }
      } catch (err) {
        if (mounted) {
          setError("Error al cargar los detalles del asiento");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [registroId]);

  const formatearFecha = (fecha: string) => {
    try {
      // Extraer solo la parte de fecha (YYYY-MM-DD)
      const fechaSola = fecha.split("T")[0];
      const [year, month, day] = fechaSola.split("-").map(Number);

      // Crear fecha sin offset de zona horaria (usar números directos)
      const date = new Date(year, month - 1, day);

      if (isNaN(date.getTime())) {
        return fecha;
      }

      return date.toLocaleDateString("es-MX", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return fecha;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando detalles...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !detalles) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">
              {error || "No se encontraron los detalles"}
            </p>
            <Link href="/">
              <Button className="w-full bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">
                <Home className="w-4 h-4 mr-2" />
                Volver al Inicio
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8 space-y-6">
            {/* Header */}
            <div className="border-b pb-4">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Detalles de tu Asiento
              </h1>
              <p className="text-gray-600">
                Confirmación de tu registro al evento
              </p>
            </div>

            {/* Main Content */}
            <div className="space-y-4">
              {/* Evento y Asiento */}
              <div className="flex gap-4 items-start">
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">EVENTO</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {detalles.evento.titulo}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      ORGANIZADOR
                    </p>
                    <p className="text-lg text-gray-900">
                      {detalles.evento.organizador || "No especificado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      ASISTENTE
                    </p>
                    <p className="text-lg text-gray-900">{detalles.nombre}</p>
                  </div>
                </div>

                {/* Asiento destacado */}
                <div className="flex-shrink-0 bg-linear-to-br from-green-500 to-green-600 text-white rounded-xl p-8 shadow-xl text-center">
                  <Armchair className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm font-medium">Tu Asiento</p>
                  <p className="text-5xl font-bold">{detalles.numeroAsiento}</p>
                </div>
              </div>

              {/* Información detallada */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 font-medium mb-1">
                    FECHA
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {formatearFecha(detalles.evento.fecha)}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-600 font-medium mb-1">HORA</p>
                  <p className="text-base font-semibold text-gray-900">
                    {detalles.evento.horaInicio} - {detalles.evento.horaFin}
                  </p>
                </div>
                <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                  <p className="text-sm text-gray-600 font-medium mb-1">
                    AUDITORIO
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    Auditorio {detalles.evento.auditorio}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 font-medium mb-1">
                    ESTADO
                  </p>
                  <p className="text-base font-semibold text-green-600">
                    ✓ Confirmado
                  </p>
                </div>
              </div>

              {/* Descripción */}
              {detalles.evento.descripcion && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium mb-2">
                    DESCRIPCIÓN
                  </p>
                  <p className="text-gray-900 leading-relaxed">
                    {detalles.evento.descripcion}
                  </p>
                </div>
              )}

              {/* Aviso importante */}
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  <strong>Recuerda:</strong> Por favor, llega{" "}
                  <strong>10 minutos antes</strong> de la hora de inicio. Ten en
                  cuenta tu{" "}
                  <strong>número de asiento ({detalles.numeroAsiento})</strong>{" "}
                  para facilitar tu entrada al evento.
                </p>
              </div>

              {/* Información de contacto */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 font-medium mb-2">
                  INFORMACIÓN DE CONTACTO
                </p>
                <p className="text-gray-900">{detalles.email}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 pt-4 border-t">
              <Link href="/" className="flex-1">
                <Button className="w-full bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg">
                  <Home className="w-4 h-4 mr-2" />
                  Volver al Inicio
                </Button>
              </Link>
            </div>

            {/* Footer message */}
            <div className="text-center text-sm text-gray-600 pt-2">
              <p>¡Esperamos tu llegada al evento! 🎉</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
