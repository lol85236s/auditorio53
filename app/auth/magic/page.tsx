"use client";
// Esta página procesa enlaces mágicos y no debe prerenderizarse estáticamente.
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type UserShort = {
  id: string;
  nombre: string;
  email: string;
  tipo_usuario: string;
};

export default function MagicLinkPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const verifyToken = async (t: string | null) => {
      if (!t) {
        if (!mounted) return;
        setError("Token no proporcionado");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/auth/magic?token=${t}`);
        const data = await res.json();

        if (!res.ok) {
          if (!mounted) return;
          setError(data.error || "Enlace inválido o expirado");
          setLoading(false);
          return;
        }

        if (!mounted) return;
        // Mostrar la pantalla de éxito brevemente antes de redirigir
        setLoading(false);
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || "Error procesando el enlace");
        setLoading(false);
      }
    };

    // Obtener token desde window.location.search para evitar el hook useSearchParams
    try {
      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
      const t = params ? params.get("token") : null;
      setToken(t);
      verifyToken(t);
    } catch (e) {
      setError("Error leyendo parámetros de la URL");
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="text-center">
          <div className="inline-block animate-spin mb-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
          </div>
          <p className="text-gray-700 font-medium">Verificando enlace...</p>
          <p className="text-sm text-gray-500 mt-2">
            Por favor espera mientras procesamos tu solicitud.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="w-[380px] bg-white rounded-xl shadow-lg p-6">
          <div className="text-center">
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-red-600 mb-2">
              Enlace Inválido
            </h1>
            <p className="text-gray-600 text-sm mb-6">{error}</p>
            <button
              onClick={() => (window.location.href = "/")}
              className="w-full bg-blue-600 text-white py-2 rounded-full text-sm font-medium hover:bg-blue-700"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="w-[380px] bg-white rounded-xl shadow-lg p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-xl font-bold text-green-600 mb-2">
            ¡Sesión iniciada!
          </h1>
          <p className="text-gray-600 text-sm mb-6">
            Redirigiendo a la página principal...
          </p>
          <div className="inline-block animate-spin">
            <div className="w-8 h-8 border-2 border-green-200 border-t-green-600 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
