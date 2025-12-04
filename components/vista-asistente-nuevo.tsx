import type React from "react";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import type { Reserva, AsistenteRegistrado } from "@/app/page";
import { BuscadorEventos } from "@/components/buscador-eventos";
import type { FiltrosBusqueda } from "@/components/buscador-eventos";
import {
  CalendarIcon,
  Clock,
  MapPin,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Armchair,
  Mail,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type PropiedadesVistaAsistente = {
  reservas: Reserva[];
  asistentesRegistrados: AsistenteRegistrado[];
  onRegisterAttendee: (
    reservaId: string,
    nombre: string,
    email: string
  ) => { exito: boolean; mensaje: string; asiento?: number };
};

export function VistaAsistente({
  reservas,
  asistentesRegistrados,
  onRegisterAttendee,
}: PropiedadesVistaAsistente) {
  const { toast } = useToast();
  const [dialogsAbiertos, setDialogsAbiertos] = useState<
    Record<string, boolean>
  >({});
  const [filtrosActivos, setFiltrosActivos] = useState<FiltrosBusqueda | null>(
    null
  );
  const [datosFormulario, setDatosFormulario] = useState({
    nombre: "",
    email: "",
  });

  // Estado para datos de la BD
  const [eventosBD, setEventosBD] = useState<any[]>([]);
  const [registrosBD, setRegistrosBD] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos iniciales desde la BD
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const [eventosRes, registrosRes] = await Promise.all([
          fetch("/api/eventos"),
          fetch("/api/registros-asistentes/all"),
        ]);

        if (eventosRes.ok) {
          const eventosData = await eventosRes.json();
          setEventosBD(eventosData.eventos || []);
        }

        if (registrosRes.ok) {
          const registrosData = await registrosRes.json();
          setRegistrosBD(registrosData.registros || []);
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // Sincronización en tiempo real para eventos
  const { data: eventosActualizados, isConnected } = useRealtimeSync<any[]>(
    "evento:creado",
    eventosBD,
    []
  );

  // Sincronización en tiempo real para registros de asistentes
  const { data: registrosActualizados } = useRealtimeSync<any[]>(
    "asistente:registrado",
    registrosBD,
    []
  );

  // Usar datos actualizados o datos iniciales
  const eventosActuales = eventosActualizados || eventosBD;
  const registrosActuales = registrosActualizados || registrosBD;

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha + "T00:00:00");
    return date.toLocaleDateString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const obtenerAsientosOcupados = (eventoId: string) => {
    return registrosActuales.filter((r: any) => r.id_evento === eventoId)
      .length;
  };

  const obtenerCapacidadMaxima = (auditorioId: number) => {
    return auditorioId === 1 ? 168 : 168;
  };

  const estaLleno = (evento: any) => {
    const ocupados = obtenerAsientosOcupados(evento.id);
    const capacidad = obtenerCapacidadMaxima(evento.id_auditorio);
    return ocupados >= capacidad;
  };

  const eventosDisponibles = eventosActuales.filter((evento: any) => {
    const fechaReserva = new Date(evento.fecha + "T00:00:00");
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fechaReserva >= hoy && !estaLleno(evento);
  });

  const eventosFiltrados = filtrosActivos
    ? eventosDisponibles.filter((evento: any) => {
        // Filtro por texto de búsqueda
        if (
          filtrosActivos.textoBusqueda &&
          !evento.titulo
            .toLowerCase()
            .includes(filtrosActivos.textoBusqueda.toLowerCase()) &&
          !evento.descripcion
            ?.toLowerCase()
            .includes(filtrosActivos.textoBusqueda.toLowerCase())
        ) {
          return false;
        }

        // Filtro por auditorio
        if (
          filtrosActivos.auditorio !== "todos" &&
          ((filtrosActivos.auditorio === "A" && evento.id_auditorio !== 1) ||
            (filtrosActivos.auditorio === "B" && evento.id_auditorio !== 2))
        ) {
          return false;
        }

        // Filtro por carrera
        if (
          filtrosActivos.carrera !== "todos" &&
          evento.carrera !== filtrosActivos.carrera
        ) {
          return false;
        }

        // Filtro por fecha inicio
        if (
          filtrosActivos.fechaInicio &&
          new Date(evento.fecha) < new Date(filtrosActivos.fechaInicio)
        ) {
          return false;
        }

        // Filtro por fecha fin
        if (
          filtrosActivos.fechaFin &&
          new Date(evento.fecha) > new Date(filtrosActivos.fechaFin)
        ) {
          return false;
        }

        return true;
      })
    : eventosDisponibles;

  const misRegistros = registrosActuales.filter(
    (registro: any) =>
      registro.asistente_email === datosFormulario.email &&
      datosFormulario.email !== ""
  );

  const setDialogAbierto = (eventoId: string, abierto: boolean) => {
    setDialogsAbiertos((prev) => ({ ...prev, [eventoId]: abierto }));
  };

  const manejarRegistro = async (eventoId: string) => {
    try {
      const response = await fetch(`/api/registros-asistentes/${eventoId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_asistente: Math.random().toString(36).substring(2, 9),
          nombre: datosFormulario.nombre,
          email: datosFormulario.email,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Registro exitoso",
          description: `Te has registrado exitosamente al evento.`,
        });
        setDialogAbierto(eventoId, false);
        setDatosFormulario({ nombre: "", email: "" });
      } else {
        toast({
          title: "Error al registrar",
          description: result.error || "Error desconocido",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error en registro:", error);
      toast({
        title: "Error al registrar",
        description: "Error de conexión",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando eventos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BuscadorEventos
        alBuscar={(filtros) => setFiltrosActivos(filtros)}
        alLimpiar={() => setFiltrosActivos(null)}
      />

      <Card className="p-6 rounded-2xl shadow-xl bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-200">
          <div className="p-2 bg-linear-to-br from-purple-500 to-purple-600 rounded-lg shadow-md">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Eventos Disponibles</h2>
            <p className="text-sm text-gray-600">
              Regístrate para asistir a un evento
            </p>
          </div>
        </div>

        {eventosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No hay eventos disponibles
            </h3>
            <p className="text-gray-500">
              Vuelve más tarde para ver nuevos eventos
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {eventosFiltrados.map((evento: any) => {
              const asientosOcupados = obtenerAsientosOcupados(evento.id);
              const capacidadAuditorio = obtenerCapacidadMaxima(
                evento.id_auditorio
              );
              const capacidadMaxima =
                evento.asistentes_esperados && evento.asistentes_esperados > 0
                  ? Math.min(evento.asistentes_esperados, capacidadAuditorio)
                  : capacidadAuditorio;
              const porcentajeOcupacion =
                (asientosOcupados / capacidadMaxima) * 100;
              const yaRegistrado = registrosActuales.some(
                (r: any) =>
                  r.id_evento === evento.id &&
                  r.asistente_email === datosFormulario.email &&
                  datosFormulario.email !== ""
              );

              return (
                <Card
                  key={evento.id}
                  className="p-5 rounded-xl shadow-lg hover:shadow-xl transition-all bg-linear-to-br from-white to-gray-50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">
                        {evento.titulo}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Por {evento.organizador_nombre}
                      </p>
                    </div>
                    <Badge
                      className={`${
                        evento.id_auditorio === 1
                          ? "bg-linear-to-r from-blue-500 to-blue-600"
                          : "bg-linear-to-r from-purple-500 to-purple-600"
                      } text-white font-semibold px-3 py-1`}
                    >
                      Auditorio {evento.id_auditorio === 1 ? "A" : "B"}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CalendarIcon className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">
                        {formatearFecha(evento.fecha)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">
                        {evento.hora_inicio} - {evento.hora_fin}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin className="w-4 h-4 text-green-500" />
                      <span className="font-medium">
                        Auditorio {evento.id_auditorio === 1 ? "A" : "B"}
                      </span>
                    </div>
                  </div>

                  {evento.descripcion && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {evento.descripcion}
                    </p>
                  )}

                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-2 font-medium text-gray-600">
                      <span className="flex items-center gap-1">
                        <Armchair className="w-3 h-3" />
                        Asientos ocupados
                      </span>
                      <span
                        className={
                          porcentajeOcupacion > 80
                            ? "text-orange-600"
                            : "text-green-600"
                        }
                      >
                        {asientosOcupados}/{capacidadMaxima}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          porcentajeOcupacion > 80
                            ? "bg-linear-to-r from-orange-500 to-red-500"
                            : "bg-linear-to-r from-green-500 to-green-600"
                        }`}
                        style={{ width: `${porcentajeOcupacion}%` }}
                      />
                    </div>
                  </div>

                  {yaRegistrado ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-700">
                        Ya estás registrado
                      </span>
                    </div>
                  ) : (
                    <>
                      {!dialogsAbiertos[evento.id] ? (
                        <Button
                          onClick={() => setDialogAbierto(evento.id, true)}
                          className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Registrarme
                        </Button>
                      ) : (
                        <div className="mt-4 p-6 rounded-2xl shadow-xl bg-white/90 border border-gray-200">
                          <h3 className="text-xl font-bold mb-2 text-purple-700">
                            Registro al Evento
                          </h3>
                          <p className="mb-4 text-gray-600 text-sm">
                            Completa tus datos para registrarte a "
                            {evento.titulo}"
                          </p>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              manejarRegistro(evento.id);
                            }}
                            className="space-y-4"
                          >
                            <div>
                              <Label
                                htmlFor={`nombre-${evento.id}`}
                                className="text-base font-semibold flex items-center gap-2"
                              >
                                <User className="w-4 h-4" />
                                Nombre Completo
                              </Label>
                              <Input
                                id={`nombre-${evento.id}`}
                                value={datosFormulario.nombre}
                                onChange={(e) =>
                                  setDatosFormulario({
                                    ...datosFormulario,
                                    nombre: e.target.value,
                                  })
                                }
                                placeholder="Tu nombre"
                                className="mt-2 rounded-lg"
                                required
                              />
                            </div>
                            <div>
                              <Label
                                htmlFor={`email-${evento.id}`}
                                className="text-base font-semibold flex items-center gap-2"
                              >
                                <Mail className="w-4 h-4" />
                                Correo Electrónico
                              </Label>
                              <Input
                                id={`email-${evento.id}`}
                                type="email"
                                value={datosFormulario.email}
                                onChange={(e) =>
                                  setDatosFormulario({
                                    ...datosFormulario,
                                    email: e.target.value,
                                  })
                                }
                                placeholder="tu@email.com"
                                className="mt-2 rounded-lg"
                                required
                              />
                            </div>
                            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                              <p>
                                Se te asignará automáticamente el siguiente
                                asiento disponible en orden de llegada.
                              </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-md"
                              >
                                Confirmar Registro
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() =>
                                  setDialogAbierto(evento.id, false)
                                }
                              >
                                Cancelar
                              </Button>
                            </div>
                          </form>
                        </div>
                      )}
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {misRegistros.length > 0 && (
        <Card className="p-6 rounded-2xl shadow-xl bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-200">
            <div className="p-2 bg-linear-to-br from-green-500 to-green-600 rounded-lg shadow-md">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Mis Registros</h2>
              <p className="text-sm text-gray-600">
                Eventos a los que estás registrado
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {misRegistros.map((registro: any) => {
              const evento = eventosActuales.find(
                (e: any) => e.id === registro.id_evento
              );
              if (!evento) return null;

              return (
                <Card
                  key={registro.id}
                  className="p-4 rounded-xl bg-linear-to-br from-green-50 to-white shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1">
                        {evento.titulo}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="flex items-center gap-2">
                          <CalendarIcon className="w-3 h-3" />
                          {formatearFecha(evento.fecha)}
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {evento.hora_inicio} - {evento.hora_fin}
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          Auditorio {evento.id_auditorio === 1 ? "A" : "B"}
                        </p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="bg-linear-to-br from-green-500 to-green-600 text-white rounded-xl p-4 shadow-lg">
                        <Armchair className="w-8 h-8 mx-auto mb-1" />
                        <p className="text-xs font-medium">Asiento</p>
                        <p className="text-3xl font-bold">
                          {registro.numero_orden}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
