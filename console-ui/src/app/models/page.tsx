"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { TopBar } from "@/components/TopBar";
import { fetchPricing, fetchModels, type Model, type PricingResponse } from "@/lib/api";
import { ModelLogo } from "@/components/ModelLogo";
import {
  Loader2,
  RefreshCw,
  Eye,
  Wrench,
  BrainCircuit,
  MessageSquare,
  ArrowUpDown,
} from "lucide-react";

/* ─── Catalog metadata (capabilities / context) ───
   Mirrors the public network catalog. Prices themselves always come live
   from the coordinator's /v1/pricing endpoint — never hardcoded. */
interface CatalogEntry {
  display: string;
  context: number;
  imageInput: boolean;
  toolCalling: boolean;
  reasoning: boolean;
  note?: string;
}

const CATALOG: Record<string, CatalogEntry> = {
  "gemma-4-26b": { display: "Gemma 4 26B", context: 131072, imageInput: true, toolCalling: true, reasoning: true },
  "gemma-4-26b-8bit": { display: "Gemma 4 26B (8-bit)", context: 131072, imageInput: true, toolCalling: true, reasoning: true },
  "gemma-4-26b-qat-4bit": { display: "Gemma 4 26B (QAT 4-bit)", context: 131072, imageInput: true, toolCalling: true, reasoning: true },
  "gpt-oss-20b": { display: "GPT-OSS 20B", context: 131072, imageInput: false, toolCalling: false, reasoning: false },
  "nvidia-nemotron-3.5-lightning": { display: "Nemotron 3.5 Lightning", context: 262144, imageInput: false, toolCalling: true, reasoning: true },
  "qwen3.5-35b-a3b": { display: "Qwen 3.5 35B A3B", context: 262144, imageInput: true, toolCalling: true, reasoning: false },
  "Qwen3.5-9B": { display: "Qwen 3.5 9B", context: 262144, imageInput: true, toolCalling: true, reasoning: false },
  "qwen3.6-35b-a3b-vl-mtp-mxfp8": { display: "Qwen 3.6 35B A3B", context: 262144, imageInput: true, toolCalling: true, reasoning: false },
  "EigenLabs/Qwen3.8-27B-4bit-mtp": { display: "Qwen 3.8 27B", context: 262144, imageInput: true, toolCalling: true, reasoning: false, note: "Apple M5 + NAX runtime only" },
  "qwen3-vl-30b-a3b-instruct": { display: "Qwen3-VL 30B A3B", context: 131072, imageInput: true, toolCalling: true, reasoning: false },
};

const FALLBACK_CONTEXT = 131072;

type SortKey = "name" | "context" | "input" | "output";

function fmtContext(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return String(tokens);
}

function fmtUsd(micro: number): string {
  const d = micro / 1_000_000;
  return d < 0.1 ? `$${d.toFixed(3)}` : `$${d.toFixed(2)}`;
}

function CapChip({ on, icon: Icon, label }: { on: boolean; icon: typeof Eye; label: string }) {
  if (!on) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border-subtle bg-bg-elevated text-[11px] font-mono text-text-secondary">
      <Icon size={10} />
      {label}
    </span>
  );
}

export default function ModelsPage() {
  const router = useRouter();
  const setSelectedModel = useStore((s) => s.setSelectedModel);
  const [entries, setEntries] = useState<Array<{ id: string; input: number; output: number }>>([]);
  const [liveModels, setLiveModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [filter, setFilter] = useState<"all" | "image" | "tools" | "reasoning">("all");

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchPricing().catch(() => null),
      fetchModels().catch(() => [] as Model[]),
    ]).then(([pricing, models]: [PricingResponse | null, Model[]]) => {
      const fromPricing = (pricing?.prices ?? []).map((p) => ({ id: p.model, input: p.input_price, output: p.output_price }));
      // If the authed /v1/models call worked, prefer it (has provider counts);
      // otherwise the public pricing feed is the source of truth.
      const byId = new Map<string, { id: string; input: number; output: number }>();
      for (const e of fromPricing) byId.set(e.id, e);
      for (const m of models) {
        if (!byId.has(m.id)) byId.set(m.id, { id: m.id, input: 0, output: 0 });
      }
      setEntries([...byId.values()]);
      setLiveModels(models);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const rows = useMemo(() => {
    const withMeta = entries.map((e) => {
      const meta = CATALOG[e.id];
      const live = liveModels.find((m) => m.id === e.id);
      return {
        ...e,
        display: meta?.display ?? e.id.split("/").pop() ?? e.id,
        context: live?.context ?? meta?.context ?? FALLBACK_CONTEXT,
        imageInput: meta?.imageInput ?? false,
        toolCalling: meta?.toolCalling ?? false,
        reasoning: meta?.reasoning ?? false,
        note: meta?.note,
        providers: live?.provider_count,
      };
    });
    const filtered = withMeta.filter((r) =>
      filter === "all" ? true
      : filter === "image" ? r.imageInput
      : filter === "tools" ? r.toolCalling
      : r.reasoning
    );
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortKey === "name") return a.display.localeCompare(b.display);
      if (sortKey === "context") return b.context - a.context;
      if (sortKey === "input") return (a.input || Infinity) - (b.input || Infinity);
      return (a.output || Infinity) - (b.output || Infinity);
    });
    return sorted;
  }, [entries, liveModels, sortKey, filter]);

  const startChat = (id: string) => {
    setSelectedModel(id);
    router.push("/");
  };

  const filters: Array<{ key: typeof filter; label: string }> = [
    { key: "all", label: "All models" },
    { key: "image", label: "Image input" },
    { key: "tools", label: "Tool calling" },
    { key: "reasoning", label: "Reasoning" },
  ];

  const sorts: Array<{ key: SortKey; label: string }> = [
    { key: "name", label: "Name" },
    { key: "context", label: "Largest context" },
    { key: "input", label: "Lowest input price" },
    { key: "output", label: "Lowest output price" },
  ];

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Models" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-ink mb-1">Model library</h2>
            <p className="text-sm text-text-tertiary">
              Compare capabilities and token prices, then start a new chat. Prices in USD per 1 million tokens.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                  filter === f.key
                    ? "bg-accent-brand text-bg-primary border-accent-brand font-bold"
                    : "border-border-subtle text-text-secondary hover:border-text-tertiary"
                }`}
              >
                {f.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-mono text-text-tertiary inline-flex items-center gap-1">
                <ArrowUpDown size={11} /> Sort
              </span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="bg-bg-secondary border border-border-subtle rounded-lg px-2.5 py-1.5 text-xs font-mono text-text-secondary outline-none focus:border-accent-brand"
              >
                {sorts.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              <button
                onClick={load}
                disabled={loading}
                className="p-1.5 rounded-lg border border-border-subtle text-text-tertiary hover:text-text-primary hover:border-text-tertiary transition-colors"
                title="Refresh"
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Count */}
          <p className="text-xs font-mono text-text-tertiary mb-3">
            {loading ? "Loading…" : `${rows.length} model${rows.length !== 1 ? "s" : ""}`}
          </p>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-text-tertiary">
              <Loader2 size={20} className="animate-spin mr-2" />
              Loading models…
            </div>
          ) : (
            <div className="rounded-xl bg-bg-white border border-border-dim overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-dim">
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Model</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Context</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Input / 1M</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Output / 1M</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-border-dim/50 last:border-b-0 hover:bg-bg-hover/40 transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <ModelLogo modelId={r.id} size={28} />
                            <div>
                              <p className="font-medium text-text-primary leading-tight">{r.display}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <CapChip on={r.imageInput} icon={Eye} label="Image input" />
                                <CapChip on={r.toolCalling} icon={Wrench} label="Tool calling" />
                                <CapChip on={r.reasoning} icon={BrainCircuit} label="Reasoning" />
                                {r.note && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-border-subtle text-[11px] font-mono text-text-tertiary">
                                    {r.note}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-text-secondary">
                          {fmtContext(r.context)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-text-secondary">
                          {r.input ? fmtUsd(r.input) : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-text-secondary">
                          {r.output ? fmtUsd(r.output) : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => startChat(r.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-brand text-bg-primary text-xs font-bold hover:bg-accent-brand-hover transition-colors"
                          >
                            <MessageSquare size={11} />
                            Chat
                          </button>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-14 text-center text-sm text-text-tertiary">
                          No models match this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 text-xs text-text-tertiary bg-bg-tertiary/40 border-t border-border-dim">
                Prices are live from the Ponsbloom coordinator. A dash means the value is not listed.
              </div>
            </div>
          )}

          <p className="mt-6 text-xs text-text-tertiary">
            Want to use these from code?{" "}
            <a href="/api-console" className="text-accent-brand hover:underline font-medium">
              Get an API key →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
