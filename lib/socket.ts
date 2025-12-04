import { createClient, SupabaseClient } from "@supabase/supabase-js";

type Handler = (payload: any) => void;

let supabase: SupabaseClient | null = null;
let isConnected = false;

// map table -> { channel, handlers: Set<Handler> }
const subscriptions: Map<string, { channel: any; handlers: Set<Handler> }> =
  new Map();
const eventHandlers: Map<string, Set<Handler>> = new Map();

function ensureClient() {
  if (!supabase) {
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.warn(
        "[realtime] SUPABASE_URL or SUPABASE_ANON_KEY not provided; realtime disabled"
      );
      return null;
    }
    supabase = createClient(url, key);
    try {
      console.info(`[realtime] Supabase client created (url=${url})`);
    } catch (e) {
      // ignore logging errors
    }
  }
  return supabase;
}

function mapEventToTable(eventName: string) {
  // map legacy event names to DB tables
  switch (eventName) {
    case "asistente:registrado":
      return { table: "registros_asistentes", event: "INSERT" };
    case "evento:creado":
      return { table: "eventos", event: "INSERT" };
    case "asientos:conteo":
      return { table: "asientos_conteo", event: "*" };
    default:
      // if eventName equals table name, use it
      return { table: eventName, event: "*" };
  }
}

export function initSocket() {
  const client = ensureClient();
  // simulate a socket-like object
  const socket = {
    connected: false,
    on(event: string, handler: Handler) {
      if (event === "connect") {
        // call connect immediately once client is available
        if (client) {
          this.connected = true;
          isConnected = true;
          try {
            handler();
          } catch (e) {
            // ignore
          }
        }
        // store handler for later if needed
        if (!eventHandlers.has(event)) eventHandlers.set(event, new Set());
        eventHandlers.get(event)!.add(handler);
        return;
      }

      if (event === "disconnect") {
        if (!eventHandlers.has(event)) eventHandlers.set(event, new Set());
        eventHandlers.get(event)!.add(handler);
        return;
      }

      // regular data event -> subscribe to table changes
      if (!eventHandlers.has(event)) eventHandlers.set(event, new Set());
      eventHandlers.get(event)!.add(handler);

      if (!client) return;

      const { table, event: op } = mapEventToTable(event);
      if (!table) return;

      if (subscriptions.has(table)) {
        // already subscribed, handlers will be invoked
        return;
      }

      const channel = client
        .channel(`realtime:${table}`)
        .on(
          "postgres_changes",
          { event: op === "*" ? "*" : op, schema: "public", table },
          (payload: any) => {
            // call all handlers for this event
            const hs = eventHandlers.get(event);
            if (hs) {
              hs.forEach((h) => {
                try {
                  h(payload.record || payload.new || payload);
                } catch (e) {
                  // ignore handler errors
                }
              });
            }
          }
        );

      try {
        channel.subscribe();
        console.info(`[realtime] subscribed to table=${table} event=${op}`);
      } catch (e) {
        console.warn(
          `[realtime] subscribe attempt to table=${table} failed`,
          e
        );
      }

      subscriptions.set(table, { channel, handlers: new Set() });
    },
    off(event: string, handler: Handler) {
      const hs = eventHandlers.get(event);
      if (hs) {
        hs.delete(handler);
      }
      // if no handlers left for table, unsubscribe
      const { table } = mapEventToTable(event);
      const sub = subscriptions.get(table);
      if (
        sub &&
        (!eventHandlers.get(event) || eventHandlers.get(event)!.size === 0)
      ) {
        try {
          sub.channel.unsubscribe();
        } catch (e) {}
        subscriptions.delete(table);
      }
    },
    emit(event: string, payload?: any) {
      // support request_data to fetch initial dataset
      if (event === "request_data") {
        const client = ensureClient();
        if (!client) return;
        const requested = payload && payload.event ? payload.event : null;
        const { table } = mapEventToTable(requested || "");
        if (!table) return;
        // fetch initial rows (limit 200)
        client
          .from(table)
          .select("*")
          .limit(200)
          .then((res: any) => {
            const rows = res.data || [];
            const hs = eventHandlers.get(requested || table);
            if (hs) {
              rows.forEach((r: any) => {
                hs.forEach((h) => {
                  try {
                    h(r);
                  } catch (e) {}
                });
              });
            }
          })
          .catch(() => {});
      }
    },
    disconnect() {
      // unsubscribe all
      subscriptions.forEach((v) => {
        try {
          v.channel.unsubscribe();
        } catch (e) {}
      });
      subscriptions.clear();
      eventHandlers.clear();
      supabase = null;
      isConnected = false;
      this.connected = false;
      const hs = eventHandlers.get("disconnect");
      if (hs)
        hs.forEach((h) => {
          try {
            h();
          } catch (e) {}
        });
    },
  };

  return socket;
}

export function getSocket() {
  // return a minimal socket-like object with connected flag
  return {
    connected: isConnected,
  } as any;
}

export function disconnectSocket() {
  // clear subscriptions and reset client
  subscriptions.forEach((v) => {
    try {
      v.channel.unsubscribe();
    } catch (e) {}
  });
  subscriptions.clear();
  eventHandlers.clear();
  supabase = null;
  isConnected = false;
}
