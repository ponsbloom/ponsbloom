"use client";

import { Cpu } from "lucide-react";

/* Vendor brand colors — logo SVGs live in /public/models/. */
const VENDOR: Record<string, { icon: string; bg: string }> = {
  openai: { icon: "/models/openai.svg", bg: "#10A37F" },
  qwen: { icon: "/models/qwen.svg", bg: "#615CED" },
  nvidia: { icon: "/models/nvidia.svg", bg: "#76B900" },
  google: { icon: "/models/google.svg", bg: "#4E86FF" },
};

const VENDOR_ORDER = ["openai", "qwen", "nvidia", "google"];

function vendorFor(modelId: string): { icon: string; bg: string } {
  const id = modelId.toLowerCase();
  for (const key of VENDOR_ORDER) {
    if (id.includes(key)) return VENDOR[key];
  }
  // Gemma models → Google; Qwen3.x covered above; Nemotron → NVIDIA
  if (id.includes("gemma")) return VENDOR.google;
  if (id.includes("nemotron")) return VENDOR.nvidia;
  if (id.includes("gpt") || id.includes("oss")) return VENDOR.openai;
  if (id.includes("qwen")) return VENDOR.qwen;
  return VENDOR.google;
}

export function ModelLogo({
  modelId,
  size = 20,
  className,
}: {
  modelId: string;
  size?: number;
  className?: string;
}) {
  const vendor = vendorFor(modelId);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg shrink-0 ${className ?? ""}`}
      style={{ width: size, height: size, background: vendor.bg }}
      aria-hidden
    >
      <img src={vendor.icon} alt="" width={size * 0.62} height={size * 0.62} />
    </span>
  );
}

export function hasModelLogo(modelId: string): boolean {
  return true; // every model falls back to a vendor badge
}

export { Cpu };
