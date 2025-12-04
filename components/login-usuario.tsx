"use client";

import { useState, useEffect } from "react";

type UserShort = {
  id: string;
  nombre: string;
  email: string;
  tipo_usuario: string;
};

export function LoginUsuario({
  onSelect,
}: {
  onSelect: (user: UserShort) => void;
}) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState("asistente");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [linkSent, setLinkSent] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/auth/me`);
        const j = await res.json();
        if (!mounted) return;
        if (res.ok && j.user) onSelect(j.user as UserShort);
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setCheckingSession(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [onSelect]);

  const submitLogin = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Error al iniciar sesión");
        return;
      }
      setLinkSent(true);
      setSuccess(
        "Se ha enviado un enlace de confirmación a tu correo. Revisa tu bandeja de entrada."
      );
      setEmail("");
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async () => {
    setError(null);
    setSuccess(null);
    if (!nombre || !email) {
      setError("Completa nombre y correo");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          email,
          tipo_usuario: tipoUsuario,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Error al registrarse");
        return;
      }
      setLinkSent(true);
      setSuccess(
        "Se ha enviado un enlace de confirmación a tu correo. Completa el registro usando el enlace."
      );
      setNombre("");
      setEmail("");
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async () => {
    const token = prompt(
      "Ingresa el token que recibiste por correo (para pruebas):"
    );
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/magic?token=${token}`);
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Token inválido");
        return;
      }
      // Refrescar la sesión
      const me = await fetch(`/api/auth/me`);
      const meJson = await me.json();
      if (me.ok && meJson.user) {
        onSelect(meJson.user as UserShort);
      }
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[380px]">
      <div className="w-[380px] bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col items-center mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center shadow-md mb-3">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 11C3 6.58172 6.58172 3 11 3H13C17.4183 3 21 6.58172 21 11V13C21 17.4183 17.4183 21 13 21H11C6.58172 21 3 17.4183 3 13V11Z"
                fill="white"
                opacity="0.12"
              />
              <path
                d="M7 10.5C7 9.11929 8.11929 8 9.5 8H14.5C15.8807 8 17 9.11929 17 10.5V13.5C17 14.8807 15.8807 16 14.5 16H9.5C8.11929 16 7 14.8807 7 13.5V10.5Z"
                stroke="white"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-blue-600">
            Sistema de Reservas - Auditorios del 53
          </h1>
          <p className="text-sm text-gray-500">Gestión de eventos y reservas</p>
        </div>

        <div className="bg-gray-100 rounded-full p-1 mb-5 flex gap-1">
          <button
            onClick={() => {
              setTab("login");
              setLinkSent(false);
              setSuccess(null);
              setError(null);
            }}
            className={`flex-1 py-2 rounded-full text-sm font-medium ${
              tab === "login" ? "bg-white shadow" : "text-gray-600"
            }`}
          >
            <span className="inline-flex items-center gap-2 justify-center">
              <span>↪</span>
              <span>Iniciar Sesión</span>
            </span>
          </button>
          <button
            onClick={() => {
              setTab("register");
              setLinkSent(false);
              setSuccess(null);
              setError(null);
            }}
            className={`flex-1 py-2 rounded-full text-sm font-medium ${
              tab === "register" ? "bg-white shadow" : "text-gray-600"
            }`}
          >
            <span className="inline-flex items-center gap-2 justify-center">
              <span>Registrarse</span>
            </span>
          </button>
        </div>

        {tab === "login" && (
          <div>
            {linkSent ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                  <p className="text-sm text-blue-700">
                    ✓ Se ha enviado un enlace a tu correo. Por favor, revisa tu
                    bandeja de entrada (y la carpeta de spam).
                  </p>
                </div>
                <button
                  onClick={handleVerifyToken}
                  className="w-full mt-2 bg-gray-600 text-white py-2 rounded-full text-sm"
                >
                  Ya tengo el enlace, ingresar token
                </button>
                <button
                  onClick={() => setLinkSent(false)}
                  className="w-full mt-2 text-gray-600 text-sm underline"
                >
                  Usar otro correo
                </button>
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-gray-700">
                  Correo electrónico
                </label>
                <input
                  className="w-full mt-2 p-3 border rounded-md bg-gray-50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@universidad.edu"
                />

                <p className="text-xs text-gray-500 mt-2 mb-4">
                  Recibirás un enlace para acceder (sin contraseña).
                </p>

                <button
                  onClick={submitLogin}
                  disabled={!email || loading}
                  className="w-full mt-2 bg-blue-600 text-white py-3 rounded-full disabled:opacity-60"
                >
                  {loading ? "Enviando..." : "Enviar Enlace"}
                </button>
              </>
            )}
          </div>
        )}

        {tab === "register" && (
          <div>
            {linkSent ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                  <p className="text-sm text-green-700">
                    ✓ Cuenta creada. Se ha enviado un enlace de confirmación a
                    tu correo.
                  </p>
                </div>
                <button
                  onClick={handleVerifyToken}
                  className="w-full mt-2 bg-gray-600 text-white py-2 rounded-full text-sm"
                >
                  Ya tengo el enlace, ingresar token
                </button>
                <button
                  onClick={() => setLinkSent(false)}
                  className="w-full mt-2 text-gray-600 text-sm underline"
                >
                  Registrarse con otro correo
                </button>
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-gray-700">
                  Nombre completo
                </label>
                <input
                  className="w-full mt-2 p-3 border rounded-md bg-gray-50"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Juan Pérez"
                />

                <label className="block text-sm font-medium text-gray-700 mt-3">
                  Correo electrónico
                </label>
                <input
                  className="w-full mt-2 p-3 border rounded-md bg-gray-50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@universidad.edu"
                />

                <label className="block text-sm font-medium text-gray-700 mt-3">
                  Tipo de usuario
                </label>
                <select
                  className="w-full mt-2 p-3 border rounded-md bg-white"
                  value={tipoUsuario}
                  onChange={(e) => setTipoUsuario(e.target.value)}
                >
                  <option value="asistente">Asistente</option>
                  <option value="organizador">Organizador</option>
                </select>

                <button
                  onClick={submitRegister}
                  disabled={!nombre || !email || loading}
                  className="w-full mt-4 bg-blue-600 text-white py-3 rounded-full disabled:opacity-60"
                >
                  {loading ? "Creando cuenta..." : "Crear Cuenta"}
                </button>
              </>
            )}
          </div>
        )}

        {checkingSession && (
          <div className="mt-3 text-sm">Comprobando sesión...</div>
        )}
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        {success && (
          <div className="mt-3 text-sm text-green-600">{success}</div>
        )}
      </div>
    </div>
  );
}
