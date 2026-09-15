import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { PrivyClientProvider } from "@/components/providers/PrivyClientProvider";
import { VerificationModeProvider } from "@/lib/verification-mode";
import { ReownWagmiProvider } from "@/components/providers/ReownWagmiProvider";

export const metadata: Metadata = {
  title: "Ponsbloom — Private AI on Verified Macs",
  description:
    "Private AI inference through hardware-attested Apple Silicon providers. Your prompts stay encrypted, your data stays yours.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ReownWagmiProvider>
          <ThemeProvider>
            <PrivyClientProvider>
              <VerificationModeProvider>
                <AppShell>{children}</AppShell>
              </VerificationModeProvider>
            </PrivyClientProvider>
          </ThemeProvider>
        </ReownWagmiProvider>
      </body>
    </html>
  );
}
