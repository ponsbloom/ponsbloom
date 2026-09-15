"use client";

import type { ReactNode } from "react";
import { useSignAndSendTransaction, useWallets } from "@privy-io/react-auth/solana";
import { IS_PRIVY_CONFIGURED } from "./PrivyClientProvider";

export interface PrivySolanaApi {
  signAndSendTransaction: ReturnType<typeof useSignAndSendTransaction>["signAndSendTransaction"];
  wallets: ReturnType<typeof useWallets>["wallets"];
}

const DISABLED_SIGN = (async () => {
  throw new Error("Wallet features require sign-in, which is not configured on this deployment.");
}) as PrivySolanaApi["signAndSendTransaction"];

function SolanaHooksConsumer({ children }: { children: (s: PrivySolanaApi) => ReactNode }) {
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { wallets } = useWallets();
  return <>{children({ signAndSendTransaction, wallets })}</>;
}

/**
 * Renders children with the Privy Solana hooks (useWallets /
 * useSignAndSendTransaction). Those hooks throw when Privy is not configured
 * (no NEXT_PUBLIC_PRIVY_APP_ID), so when unconfigured we pass a disabled stub
 * instead of mounting the hooks at all. Usage:
 *
 *   <PrivySolanaGate>
 *     {({ signAndSendTransaction, wallets }) => <MyComponent ... />}
 *   </PrivySolanaGate>
 */
export function PrivySolanaGate({ children }: { children: (s: PrivySolanaApi) => ReactNode }) {
  if (!IS_PRIVY_CONFIGURED) {
    return <>{children({ signAndSendTransaction: DISABLED_SIGN, wallets: [] })}</>;
  }
  return <SolanaHooksConsumer>{children}</SolanaHooksConsumer>;
}
