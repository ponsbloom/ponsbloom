"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { Sidebar } from "./Sidebar";
import { Toasts } from "./Toasts";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = useAuth();
  const pathname = usePathname();

  // Reconcile the sidebar with the real viewport after hydration. The store's
  // initial sidebarOpen is a fixed value so SSR matches the first client
  // render; zustand's persisted value (and the viewport) are applied here,
  // post-hydration, which React treats as a normal update — no mismatch.
  useEffect(() => {
    const { sidebarOpen, setSidebarOpen } = useStore.getState();
    const wide = window.innerWidth >= 640;
    if (sidebarOpen !== wide && !localStorage.getItem("ponsbloom-store")) {
      setSidebarOpen(wide);
    }
  }, []);

  // Device-linking page — no shell
  if (pathname === "/link") {
    return <>{children}</>;
  }

  // Loading state
  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="text-center">
          <h1 className="text-3xl text-ink tracking-tight" style={{ fontFamily: "'Louize', Georgia, serif" }}>
            Ponsbloom
          </h1>
          <p className="mt-2 text-sm text-text-tertiary">Loading...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated — show page content without sidebar
  if (!authenticated) {
    return (
      <div className="flex h-screen overflow-hidden bg-bg-primary">
        <main className="flex-1 flex flex-col overflow-y-auto">{children}</main>
        <Toasts />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-y-auto">{children}</main>
      <Toasts />
    </div>
  );
}
