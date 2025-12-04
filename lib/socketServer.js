const { query, detectColumn } = require("./db");
const { Server } = require("socket.io");
let supabase = null;
try {
  const { createClient } = require("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (url && key) {
    supabase = createClient(url, key);
  } else {
    console.warn(
      "[socketServer] Supabase service key not configured; some realtime broadcasts may be disabled."
    );
  }
} catch (e) {
  console.warn(
    "[socketServer] @supabase/supabase-js not available:",
    e && e.message
  );
}

// Guardar instancia global de Socket.IO
let io = null;

/**
 * Inicializar instancia de Socket.IO
 */
function initIO(server) {
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      console.log("Cliente conectado:", socket.id);

      // Escuchar solicitudes de datos iniciales
      socket.on("request_data", (data) => {
        console.log("Solicitud de datos:", data);
        // Responder con el estado actual según el tipo de evento solicitado.
        (async () => {
          try {
            if (!data || !data.event) return;

            // Si piden registros de asistentes, enviamos todos los registros
            if (data.event === "asistente:registrado") {
              const rows = await getAllRegistrosAsistentes();
              // Emitir cada registro de forma individual para que el cliente
              // pueda procesarlo con la misma lógica que los broadcasts en vivo.
              rows.forEach((r) => socket.emit("asistente:registrado", r));
              return;
            }

            // Si piden eventos, enviamos la lista de eventos actuales
            if (data.event === "evento:creado") {
              const eventos = await getEventos();
              eventos.forEach((e) => socket.emit("evento:creado", e));
              return;
            }
          } catch (err) {
            console.error("Error respondiendo a request_data:", err);
          }
        })();
      });

      socket.on("disconnect", () => {
        console.log("Cliente desconectado:", socket.id);
      });
    });
  }
  try {
    // Guardar también en el objeto global para compatibilidad entre
    // diferentes paths de import/require dentro del mismo proceso Node.
    global.__SOCKET_IO__ = io;
  } catch (e) {
    // en algunos entornos global puede ser protegido; no crítico
  }
  return io;
}

/**
 * Obtener instancia de Socket.IO
 */
function getIO() {
  // Retornar la instancia si está inicializada, o intentar leerla desde
  // `global.__SOCKET_IO__` para compatibilidad cuando el módulo se haya
  // cargado por diferentes rutas/resolvers (Next.js dev bundling).
  if (io) return io;
  try {
    if (global.__SOCKET_IO__) return global.__SOCKET_IO__;
  } catch (e) {
    // ignore access errors
  }
  return null;
}

/**
 * Broadcast de evento a todos los clientes conectados
 */
async function broadcastEvent(eventName, data) {
  try {
    const ioInstance = getIO();
    if (ioInstance) {
      ioInstance.emit(eventName, data);
      console.log(`[Broadcast] ${eventName}:`, data);
      return;
    }

    // If Socket.IO is not initialized (e.g. in serverless), fallback to Supabase-based broadcasts
    // For simple CRUD events we expect the API routes to already write to DB (which will trigger Supabase Realtime).
    // Special-case computed broadcasts like `asientos:conteo`: persist into `asientos_conteo` so clients subscribed
    // to that table receive the update.
    if (eventName === "asientos:conteo" && supabase) {
      try {
        const payload = typeof data === "object" ? data : { data };
        await supabase.from("asientos_conteo").upsert(
          {
            id_evento:
              payload.id_evento || payload.eventoId || payload.reservaId,
            payload,
          },
          { onConflict: "evento_id" }
        );
        console.log(
          `[Broadcast][supabase] upserted asientos_conteo for ${
            payload.id_evento || payload.eventoId || payload.reservaId
          }`
        );
        return;
      } catch (e) {
        console.warn(
          "[Broadcast][supabase] failed to upsert asientos_conteo",
          e && e.message
        );
      }
    }

    console.debug(
      `Broadcast skipped (${eventName}): no Socket.IO and no supabase fallback`
    );
    // Attempt a generic Supabase fallback: write a lightweight row into `realtime_events`
    // so clients subscribed via Supabase Realtime can still receive updates.
    // This is optional — if the `realtime_events` table is not present the insert will fail
    // and we quietly ignore it.
    if (supabase) {
      try {
        const payload = typeof data === "object" ? data : { data };
        await supabase.from("realtime_events").insert([
          {
            event_name: eventName,
            payload: payload,
            created_at: new Date().toISOString(),
          },
        ]);
        console.log(
          `[Broadcast][supabase] inserted realtime_events row for ${eventName}`
        );
        return;
      } catch (e) {
        // If the table doesn't exist or insert fails, log and continue
        console.warn(
          `[Broadcast][supabase] realtime_events insert failed for ${eventName}:`,
          e && e.message
        );
      }
    }
  } catch (err) {
    console.error(`Error en broadcast ${eventName}:`, err);
  }
}

module.exports = {
  initIO,
  getIO,
  broadcastEvent,
  getEventos,
  getAsientos,
  getRegistrosAsistentes,
  getAllRegistrosAsistentes,
  computeAndBroadcastAsientosConteo,
};

/**
 * API para obtener eventos desde la BD
 */
async function getEventos() {
  try {
    // Compute per-event counts and archivado so realtime initial payloads
    // match the API `/api/eventos` shape. `archivado` is true only when
    // the event's end datetime (fecha + hora_fin) is in the past.
    // detect columns to support legacy/new naming
    const organizadorCol = await detectColumn("eventos", [
      "id_organizador",
      "organizador_id",
    ]);
    const auditorioCol = await detectColumn("eventos", [
      "id_auditorio",
      "auditorio_id",
    ]);
    const raEventoCol = await detectColumn("registros_asistentes", [
      "id_evento",
      "evento_id",
    ]);

    const result = await query(
      `
      SELECT
        e.id,
        e.titulo,
        e.descripcion,
        e.${auditorioCol} as id_auditorio,
        e.fecha,
        e.hora_inicio,
        e.hora_fin,
        e.asistentes_esperados,
        e.estado,
        e.tipo_evento,
        e.carrera,
        u.nombre as organizador_nombre,
        u.email as organizador_email,
        COALESCE(a.capacidad_total, e.asistentes_esperados, 0) AS capacidad_total,
        COUNT(ra.*) FILTER (WHERE ra.estado = 'confirmado') AS asistentes_registrados,
        ((e.fecha + e.hora_fin) < NOW()) AS archivado
      FROM eventos e
      INNER JOIN usuarios u ON e.${organizadorCol} = u.id
      LEFT JOIN auditorios a ON e.${auditorioCol} = a.id
      LEFT JOIN registros_asistentes ra ON ra.${raEventoCol} = e.id
      GROUP BY e.id, u.nombre, u.email, a.capacidad_total
      ORDER BY e.fecha DESC, e.hora_inicio
      `
    );

    // Map DB rows to the shape the frontend expects (keep legacy keys too)
    const mapped = result.rows.map((r) => ({
      ...r,
      asistentes: Number(r.asistentes_esperados || 0),
      asistentes_registrados: Number(r.asistentes_registrados || 0),
      capacidad_total: Number(r.capacidad_total || 0),
      archivado: Boolean(r.archivado),
    }));

    return mapped;
  } catch (err) {
    console.error("Error fetching eventos:", err);
    return [];
  }
}

/**
 * API para obtener asientos de un auditorio
 */
async function getAsientos(auditorioId) {
  try {
    const audCol = await detectColumn("asientos", [
      "id_auditorio",
      "auditorio_id",
    ]);
    const result = await query(
      `
      SELECT
        id,
        ${audCol} as id_auditorio,
        numero_asiento,
        fila,
        seccion,
        estado
      FROM asientos
      WHERE ${audCol} = $1
      ORDER BY numero_asiento
      `,
      [auditorioId]
    );
    return result.rows;
  } catch (err) {
    console.error("Error fetching asientos:", err);
    return [];
  }
}

/**
 * API para obtener registros de asistentes de un evento
 */
async function getRegistrosAsistentes(eventoId) {
  try {
    const raEventoCol = await detectColumn("registros_asistentes", [
      "id_evento",
      "evento_id",
    ]);
    const raAsistenteCol = await detectColumn("registros_asistentes", [
      "id_asistente",
      "asistente_id",
    ]);
    const raAsientoCol = await detectColumn("registros_asistentes", [
      "id_asiento",
      "asiento_id",
    ]);

    const result = await query(
      `
      SELECT
        id,
        ${raEventoCol} AS id_evento,
        ${raAsistenteCol} AS id_asistente,
        ${raAsientoCol} AS id_asiento,
        numero_orden,
        fecha_registro,
        estado
      FROM registros_asistentes
      WHERE ${raEventoCol} = $1
      ORDER BY numero_orden
      `,
      [eventoId]
    );
    return result.rows;
  } catch (err) {
    console.error("Error fetching registros_asistentes:", err);
    return [];
  }
}

/**
 * Obtener todos los registros de asistentes (join con usuario y asiento)
 */
async function getAllRegistrosAsistentes() {
  try {
    const raEventoCol = await detectColumn("registros_asistentes", [
      "id_evento",
      "evento_id",
    ]);
    const raAsistenteCol = await detectColumn("registros_asistentes", [
      "id_asistente",
      "asistente_id",
    ]);
    const raAsientoCol = await detectColumn("registros_asistentes", [
      "id_asiento",
      "asiento_id",
    ]);

    const result = await query(
      `
      SELECT
        ra.id,
        ra.${raEventoCol} AS id_evento,
        ra.${raAsistenteCol} AS id_asistente,
        u.nombre,
        u.email,
        ra.${raAsientoCol} AS id_asiento,
        ra.numero_orden,
        ra.fecha_registro,
        ra.estado
      FROM registros_asistentes ra
      LEFT JOIN usuarios u ON ra.${raAsistenteCol} = u.id
      ORDER BY ra.fecha_registro
      `
    );

    // Mapear a la forma que el frontend espera (mezcla camel/snake handled client-side)
    return result.rows.map((r) => ({
      id: r.id,
      eventoId: r.id_evento,
      id_evento: r.id_evento,
      asistenteId: r.id_asistente,
      id_asistente: r.id_asistente,
      nombre: r.nombre,
      email: r.email,
      asientoId: r.id_asiento,
      numero_orden: r.numero_orden,
      numeroAsiento: r.numero_orden,
      fecha_registro: r.fecha_registro,
      fechaRegistro: r.fecha_registro,
      estado: r.estado,
    }));
  } catch (err) {
    console.error("Error fetching all registros_asistentes:", err);
    return [];
  }
}

/**
 * Calcular conteo de asientos ocupados para un evento y emitir un evento agregado
 * hacia todos los clientes conectados: `asientos:conteo`.
 *
 * Payload ejemplo:
 * {
 *   reservaId: <eventoId>,
 *   eventoId: <eventoId>,
 *   id_evento: <eventoId>,
 *   auditorio: <auditorio_id>,
 *   id_auditorio: <auditorio_id>,
 *   ocupados: <number>,
 *   capacidad: <number>,
 *   capacidad_total: <number>
 * }
 */
async function computeAndBroadcastAsientosConteo(eventoId) {
  try {
    if (!eventoId) return null;

    const auditorioCol = await detectColumn("eventos", [
      "id_auditorio",
      "auditorio_id",
    ]);
    const raEventoCol = await detectColumn("registros_asistentes", [
      "id_evento",
      "evento_id",
    ]);

    const result = await query(
      `
      SELECT
        e.id as evento_id,
        e.${auditorioCol} as id_auditorio,
        COALESCE(a.capacidad_total, 0) as capacidad_total,
        COUNT(ra.*) FILTER (WHERE ra.estado = 'confirmado') as ocupados
      FROM eventos e
      LEFT JOIN auditorios a ON e.${auditorioCol} = a.id
      LEFT JOIN registros_asistentes ra ON ra.${raEventoCol} = e.id
      WHERE e.id = $1
      GROUP BY e.id, e.${auditorioCol}, a.capacidad_total
      `,
      [eventoId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const payload = {
      reservaId: row.id_evento,
      eventoId: row.id_evento,
      id_evento: row.id_evento,
      auditorio: row.id_auditorio,
      id_auditorio: row.id_auditorio,
      ocupados: parseInt(row.ocupados, 10) || 0,
      capacidad: parseInt(row.capacidad_total, 10) || 0,
      capacidad_total: parseInt(row.capacidad_total, 10) || 0,
    };

    // Usar el broadcast helper para emitir a todos los clientes
    await broadcastEvent("asientos:conteo", payload);
    return payload;
  } catch (err) {
    console.error("Error computing/broadcasting asientos:conteo:", err);
    return null;
  }
}
