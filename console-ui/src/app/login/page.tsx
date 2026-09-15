"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { Mail } from "lucide-react";
import { PonsbloomMark } from "@/components/brand/PonsbloomMark";

function LoginContent() {
  const { ready, authenticated, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (ready && authenticated) {
      const next = searchParams.get("next") || "/";
      router.replace(next);
    }
  }, [ready, authenticated, router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="relative z-10 text-center max-w-md mx-auto px-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <PonsbloomMark size={40} />
          <h1 className="text-5xl text-ink" style={{ fontFamily: "'Louize', Georgia, serif", letterSpacing: "-0.03em" }}>
            Ponsbloom
          </h1>
        </div>
        <div className="flex justify-center mb-6">
          <span className="px-2 py-0.5 rounded-md bg-accent-brand/15 border border-accent-brand/30 text-accent-brand text-[10px] font-mono font-bold uppercase tracking-wider">
            Beta
          </span>
        </div>
        <p className="text-base text-text-secondary mb-8 leading-relaxed">
          Private inference on verified hardware.
          <br />
          <span className="text-text-tertiary">Your prompts stay encrypted, your data stays yours.</span>
        </p>

        <button
          onClick={login}
          disabled={!ready}
          className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg
                     bg-coral text-bg-primary font-bold text-sm
                     hover:opacity-90
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all focus-ring"
        >
          <Mail size={15} />
          {!ready ? "Loading..." : "Continue with Email"}
        </button>

        <p className="mt-3 text-xs text-text-tertiary">
          Sign in with email to provision your API key
        </p>

        <p className="mt-10 text-xs font-mono text-text-tertiary tracking-wide">
          End-to-end encrypted · Apple Silicon · Decentralized
        </p>

        <p className="mt-4 text-[10px] text-text-tertiary leading-relaxed max-w-xs mx-auto">
          Research preview (beta). Provided as-is for evaluation.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
