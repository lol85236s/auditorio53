import { useEffect, useState, useCallback } from "react";
import { getSocket, initSocket } from "@/lib/socket";
import { Socket } from "socket.io-client";

/**
 * Hook para sincronización en tiempo real con Socket.IO
 * Escucha eventos de cambios en la BD y actualiza el estado del componente
 */
export function useRealtimeSync<T>(
  eventName: string,
  initialData: T,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T>(initialData);
  const [isConnected, setIsConnected] = useState(false);

  // Si el initialData cambia (p. ej. carga inicial desde el servidor), sincronizamos el estado interno
  useEffect(() => {
    setData(initialData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  useEffect(() => {
    const socket = initSocket();

    const handleConnect = () => {
      setIsConnected(true);
      // Solicitar datos iniciales al conectar
      try {
        socket.emit("request_data", { event: eventName });
      } catch (e) {
        // ignore emit errors
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleDataUpdate = (newData: T) => {
      // Evitar logging excesivo en cada mensaje (dev only)
      try {
        // Si el estado es un array, intentamos agregar evitando duplicados
        setData((prev: any) => {
          if (Array.isArray(prev)) {
            try {
              const incoming = newData as any;
              if (incoming && incoming.id) {
                const exists = (prev as any[]).some(
                  (p: any) => p.id === incoming.id
                );
                if (exists) return prev;
              }
            } catch (e) {
              // ignore
            }
            return [...(prev as any[]), newData] as T;
          }

          // Para valores no-array, reemplazar directamente
          return newData;
        });
      } catch (e) {
        // ignore update errors
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on(eventName, handleDataUpdate);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off(eventName, handleDataUpdate);
    };
  }, [eventName, ...dependencies]);

  return { data, isConnected };
}

/**
 * Hook para emitir eventos a través de Socket.IO
 */
export function useSocketEmit() {
  const emit = useCallback((eventName: string, payload: any) => {
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit(eventName, payload);
    } else {
      console.warn(`Socket no conectado. No se pudo emitir ${eventName}`);
    }
  }, []);

  return { emit };
}
