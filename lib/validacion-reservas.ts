import type { Reserva } from "@/app/page";

export type ResultadoValidacion = {
  esValido: boolean;
  error?: string;
  advertencias?: string[];
};

export type EntradaReserva = {
  auditorio: "A" | "B";
  fecha: string;
  horaInicio: string;
  asistentes: number;
  titulo: string;
};

const HORARIOS_NEGOCIO = {
  inicio: 7,
  fin: 17,
};

const CAPACIDAD_AUDITORIO = {
  A: 168,
  B: 168,
};

const DURACION_RESERVA = 1;

function formatearFechaLocal(fecha: Date): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizarFecha(fecha: string | Date): string {
  const fechaObj =
    typeof fecha === "string" ? new Date(fecha + "T00:00:00") : fecha;
  return formatearFechaLocal(fechaObj);
}

export class MiddlewareValidacionReservas {
  private reservas: Reserva[];
  private horaAMinutos: (hora: string) => number;

  constructor(reservas: Reserva[]) {
    this.reservas = reservas;
    this.horaAMinutos = (hora: string) => {
      const [h, m] = hora.split(":").map(Number);
      return h * 60 + m;
    };
  }

  validar(entrada: EntradaReserva): ResultadoValidacion {
    const validaciones = [
      this.validarHorariosNegocio(entrada),
      this.validarFechaFutura(entrada),
      this.validarRestriccionHorarioDia(entrada),
      this.validarDisponibilidadHorario(entrada),
      this.validarCapacidad(entrada),
      this.validarFormatoHora(entrada),
    ];

    const error = validaciones.find((v) => !v.esValido);
    if (error) {
      return error;
    }

    const advertencias = validaciones
      .flatMap((v) => v.advertencias || [])
      .filter(Boolean);

    return {
      esValido: true,
      advertencias: advertencias.length > 0 ? advertencias : undefined,
    };
  }

  private validarHorariosNegocio(entrada: EntradaReserva): ResultadoValidacion {
    const [hora, minuto] = entrada.horaInicio.split(":").map(Number);
    const minutosInicio = hora * 60 + minuto;
    const minutosFin = minutosInicio + DURACION_RESERVA * 60;

    const minutosApertura = HORARIOS_NEGOCIO.inicio * 60;
    const minutosCierre = HORARIOS_NEGOCIO.fin * 60;

    if (minutosInicio < minutosApertura) {
      return {
        esValido: false,
        error: `El horario de inicio debe ser después de las ${HORARIOS_NEGOCIO.inicio}:00 AM`,
      };
    }

    if (minutosFin > minutosCierre) {
      return {
        esValido: false,
        error: `La reserva terminaría después del horario de cierre (${HORARIOS_NEGOCIO.fin}:00)`,
      };
    }

    return { esValido: true };
  }

  private validarRestriccionHorarioDia(
    entrada: EntradaReserva
  ): ResultadoValidacion {
    const ahora = new Date();
    const horaActual = ahora.getHours();
    const fechaHoy = formatearFechaLocal(ahora);
    const fechaReserva = normalizarFecha(entrada.fecha);

    // Si son las 4 PM o después (16:00 o más)
    if (horaActual >= 16) {
      // Y están intentando reservar para hoy
      if (fechaReserva === fechaHoy) {
        return {
          esValido: false,
          error:
            "Después de las 4:00 PM no se pueden hacer reservas para el mismo día. Por favor selecciona una fecha futura.",
        };
      }
    }

    return { esValido: true };
  }

  private validarFechaFutura(entrada: EntradaReserva): ResultadoValidacion {
    const fechaReservaStr = normalizarFecha(entrada.fecha);
    const [hora, minuto] = entrada.horaInicio.split(":").map(Number);

    const fechaReserva = new Date(fechaReservaStr + "T00:00:00");
    fechaReserva.setHours(hora, minuto, 0, 0);

    const ahora = new Date();

    if (fechaReserva < ahora) {
      return {
        esValido: false,
        error: "No se pueden hacer reservas en fechas u horas pasadas",
      };
    }

    const diferenciaHoras =
      (fechaReserva.getTime() - ahora.getTime()) / (1000 * 60 * 60);
    if (diferenciaHoras < 1 && diferenciaHoras > 0) {
      return {
        esValido: true,
        advertencias: [
          "La reserva es en menos de 1 hora. Asegúrate de tener tiempo suficiente para preparar.",
        ],
      };
    }

    return { esValido: true };
  }

  private validarDisponibilidadHorario(
    entrada: EntradaReserva
  ): ResultadoValidacion {
    const fechaEntradaNormalizada = normalizarFecha(entrada.fecha);

    const minutosInicioEntrada = this.horaAMinutos(entrada.horaInicio);
    const minutosFinEntrada = minutosInicioEntrada + DURACION_RESERVA * 60;

    const conflictos = this.reservas.filter((reserva) => {
      if (reserva.auditorio !== entrada.auditorio) return false;

      const fechaReservaNormalizada = normalizarFecha(reserva.fecha);
      if (fechaReservaNormalizada !== fechaEntradaNormalizada) return false;

      const minutosInicioReserva = this.horaAMinutos(reserva.horaInicio);
      const minutosFinReserva = this.horaAMinutos(reserva.horaFin);

      const hayConflicto =
        minutosInicioEntrada < minutosFinReserva &&
        minutosInicioReserva < minutosFinEntrada;

      return hayConflicto;
    });

    if (conflictos.length > 0) {
      const conflicto = conflictos[0];
      return {
        esValido: false,
        error: `El Auditorio ${entrada.auditorio} ya está reservado de ${conflicto.horaInicio} a ${conflicto.horaFin} para "${conflicto.titulo}"`,
      };
    }

    return { esValido: true };
  }

  private validarCapacidad(entrada: EntradaReserva): ResultadoValidacion {
    const capacidad = CAPACIDAD_AUDITORIO[entrada.auditorio];

    if (entrada.asistentes > capacidad) {
      return {
        esValido: false,
        error: `El Auditorio ${entrada.auditorio} tiene capacidad para ${capacidad} personas. Solicitaste ${entrada.asistentes}.`,
      };
    }

    if (entrada.asistentes > capacidad * 0.9) {
      return {
        esValido: true,
        advertencias: [
          `Estás cerca del límite de capacidad (${entrada.asistentes}/${capacidad}). Considera el espacio para circulación.`,
        ],
      };
    }

    return { esValido: true };
  }

  private validarFormatoHora(entrada: EntradaReserva): ResultadoValidacion {
    const regexHora = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!regexHora.test(entrada.horaInicio)) {
      return {
        esValido: false,
        error: "Formato de hora inválido. Use HH:MM",
      };
    }

    return { esValido: true };
  }

  obtenerHorariosDisponibles(auditorio: "A" | "B", fecha: string): string[] {
    const disponibles: string[] = [];
    const fechaNormalizada = normalizarFecha(fecha);

    const ahora = new Date();
    const fechaHoy = formatearFechaLocal(ahora);
    const horaActual = ahora.getHours();

    // Si es hoy y ya son las 4 PM o después, no mostrar horarios disponibles
    if (fechaNormalizada === fechaHoy && horaActual >= 16) {
      return [];
    }

    for (
      let hora = HORARIOS_NEGOCIO.inicio;
      hora < HORARIOS_NEGOCIO.fin;
      hora++
    ) {
      const ranuraHoraria = `${hora.toString().padStart(2, "0")}:00`;

      const minutosInicio = hora * 60;
      const minutosFin = minutosInicio + DURACION_RESERVA * 60;

      const estaDisponible = !this.reservas.some((reserva) => {
        if (reserva.auditorio !== auditorio) return false;

        const fechaReservaNormalizada = normalizarFecha(reserva.fecha);
        if (fechaReservaNormalizada !== fechaNormalizada) return false;

        const minutosInicioReserva = this.horaAMinutos(reserva.horaInicio);
        const minutosFinReserva = this.horaAMinutos(reserva.horaFin);

        return (
          minutosInicio < minutosFinReserva && minutosInicioReserva < minutosFin
        );
      });

      if (estaDisponible) {
        disponibles.push(ranuraHoraria);
      }
    }

    return disponibles;
  }

  estaHorarioDisponible(
    auditorio: "A" | "B",
    fecha: string,
    horaInicio: string
  ): boolean {
    const horariosDisponibles = this.obtenerHorariosDisponibles(
      auditorio,
      fecha
    );
    return horariosDisponibles.includes(horaInicio);
  }

  obtenerEstadisticasUso(auditorio?: "A" | "B") {
    const filtradas = auditorio
      ? this.reservas.filter((r) => r.auditorio === auditorio)
      : this.reservas;

    const ranurasTotal = (HORARIOS_NEGOCIO.fin - HORARIOS_NEGOCIO.inicio) * 7;
    const ranurasReservadas = filtradas.length;
    const tasaUtilizacion = (ranurasReservadas / ranurasTotal) * 100;

    return {
      totalReservas: filtradas.length,
      tasaUtilizacion: tasaUtilizacion.toFixed(2) + "%",
      promedioAsistentes:
        filtradas.reduce((suma, r) => suma + r.asistentes, 0) /
          filtradas.length || 0,
    };
  }
}

export function crearValidadorReservas(reservas: Reserva[]) {
  return new MiddlewareValidacionReservas(reservas);
}
