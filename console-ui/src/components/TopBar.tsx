"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Menu } from "lucide-react";
import { E2ELockIndicator } from "./E2ELockIndicator";
import { TrustExplainerModal } from "./TrustExplainerModal";

export function TopBar({ title }: { title?: string }) {
  const { sidebarOpen, setSidebarOpen, chats, activeChatId } = useStore();
  const [showExplainer, setShowExplainer] = useState(false);

  const activeChat = chats.find((c) => c.id === activeChatId);
  // Get trust metadata from the last assistant message with trust info
  const lastTrust = activeChat?.messages
    .filter((m) => m.role === "assistant" && m.trust)
    .at(-1)?.trust;

  return (
    <>
      <header className="h-14 bg-bg-primary/80 backdrop-blur-sm flex items-center px-3 sm:px-5 gap-3 shrink-0 border-b border-border-dim">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors border-2 border-transparent hover:border-border-subtle"
          >
            <Menu size={18} />
          </button>
        )}
        {!sidebarOpen && (
          <div className="mr-1">
            <span className="text-xl text-ink tracking-tight" style={{ fontFamily: "'Louize', Georgia, serif" }}>
              Ponsbloom
            </span>
          </div>
        )}

        {/* Breadcrumb — Console / <page> */}
        <div className="flex items-center gap-1.5 text-sm font-mono">
          <span className="text-text-tertiary">Console</span>
          {title && (
            <>
              <span className="text-text-tertiary/50">/</span>
              <span className="text-text-primary font-medium">{title}</span>
            </>
          )}
        </div>

        {/* E2E lock indicator — shown when there's an active chat */}
        {activeChat && activeChat.messages.length > 0 && (
          <div className="ml-auto">
            <E2ELockIndicator
              trust={lastTrust}
              onOpenExplainer={() => setShowExplainer(true)}
            />
          </div>
        )}
      </header>

      <TrustExplainerModal
        open={showExplainer}
        onClose={() => setShowExplainer(false)}
      />
    </>
  );
}
