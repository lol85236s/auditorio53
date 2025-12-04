"use client";

import { Users, UserPlus, Building2 } from "lucide-react";

type MenuSeleccionUsuarioProps = {
  alSeleccionar: (tipo: "organizador" | "asistente") => void;
};

export function MenuSeleccionUsuario({
  alSeleccionar,
}: MenuSeleccionUsuarioProps) {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-linear-to-br from-blue-500 to-cyan-500 mb-6 shadow-2xl">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-linear-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            Sistema de Reservas - Auditorios del 53
          </h1>
          <p className="text-xl text-gray-600">
            Selecciona el tipo de usuario para continuar
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Opción Organizador */}
          <button
            onClick={() => alSeleccionar("organizador")}
            className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 border-transparent hover:border-blue-200"
          >
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-cyan-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 mb-6 shadow-lg group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-2xl font-bold mb-3 text-gray-800">
                Organizar Conferencia
              </h2>

              <p className="text-gray-600 mb-6 leading-relaxed">
                Para maestros, investigadores y personal que desean reservar
                auditorios para eventos, conferencias o clases.
              </p>

              <div className="space-y-2 text-left">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                  <span>Reservar auditorios </span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                  <span>Gestionar eventos y horarios</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                  <span>Ver calendario de disponibilidad</span>
                </div>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 text-blue-600 font-semibold group-hover:gap-3 transition-all">
                Continuar como Organizador
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </button>

          {/* Opción Asistente */}
          <button
            onClick={() => alSeleccionar("asistente")}
            className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 border-transparent hover:border-purple-200"
          >
            <div className="absolute inset-0 bg-linear-to-br from-purple-500/5 to-pink-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-purple-500 to-purple-600 mb-6 shadow-lg group-hover:scale-110 transition-transform">
                <UserPlus className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-2xl font-bold mb-3 text-gray-800">
                Asistir a Conferencia
              </h2>

              <p className="text-gray-600 mb-6 leading-relaxed">
                Para estudiantes y público en general que desean registrarse y
                asistir a conferencias programadas en los auditorios.
              </p>

              <div className="space-y-2 text-left">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
                  <span>Ver eventos disponibles</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
                  <span>Registrarse y obtener asiento</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
                  <span>Gestionar mis registros</span>
                </div>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 text-purple-600 font-semibold group-hover:gap-3 transition-all">
                Continuar como Asistente
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">©</p>
        </div>
      </div>
    </div>
  );
}
