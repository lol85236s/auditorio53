"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

export default function UserEmailMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (data?.user?.email) setEmail(data.user.email);
        if (data?.user?.nombre) setName(data.user.nombre);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // reload to update UI
    router.refresh();
    window.location.href = "/";
  }

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={email ? `Cuenta ${email}` : "Cuenta"}
            className="inline-flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted"
          >
            <Avatar className="size-8">
              <AvatarFallback>
                {(() => {
                  const src = name || email || "U";
                  const parts = String(src).trim().split(/\s+/);
                  if (parts.length === 1)
                    return parts[0].charAt(0).toUpperCase();
                  return (
                    parts[0].charAt(0) + (parts[1] ? parts[1].charAt(0) : "")
                  ).toUpperCase();
                })()}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <div className="px-3 py-2">
            <div className="text-sm font-medium truncate">
              {name ?? email ?? "Usuario"}
            </div>
            {email ? (
              <div className="text-xs text-muted-foreground truncate">
                {email}
              </div>
            ) : null}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleLogout}
            className="flex items-center"
          >
            Salir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
