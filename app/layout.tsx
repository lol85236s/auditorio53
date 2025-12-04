import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import UserEmailMenu from "../components/user-email-menu";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistema de Reservas - Auditorios",
  description: "Sistema de gestión de reservas para auditorios",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen flex flex-col">
          <header className="w-full border-b bg-background px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="text-lg font-semibold">Sistema de Reservas</div>
              <div className="flex items-center gap-2">
                <UserEmailMenu />
              </div>
            </div>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
