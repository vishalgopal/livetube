"use client";

import { useState } from "react";
import { BrainCircuit, Copy, Check, Sparkles, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { generateMetadataAction } from "@/app/actions/templates";

interface Template {
  id: string;
  name: string;
  category: string;
}

interface MetadataGeneratorProps {
  templates: Template[];
}

export default function MetadataGenerator({ templates }: MetadataGeneratorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Generated results state
  const [result, setResult] = useState<{
    title: string;
    description: string;
    tags: string[];
    hashtags: string[];
    pinnedComment: string;
  } | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId || !topic) return;

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await generateMetadataAction(topic, selectedTemplateId);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || "Failed to generate metadata.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during generation.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Input Workspace */}
      <div className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-4">
        <h3 className="text-sm font-bold text-ink font-mono uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-link" />
          AI Generator Workspace
        </h3>

        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="flex flex-col gap-1.5 md:col-span-1">
            <label className="text-xs font-semibold text-body">Select Template</label>
            <select
              required
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink cursor-pointer"
            >
              <option value="" disabled>
                -- Choose Template --
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category.toLowerCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-1">
            <label className="text-xs font-semibold text-body">Enter Video Topic / Title</label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. 1008 Shiva Mahamantra Live"
              className="w-full px-3 py-1.5 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !selectedTemplateId || !topic}
            className="flex items-center justify-center gap-2 py-1.5 px-4 rounded-lg bg-primary hover:bg-ink text-on-primary text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <BrainCircuit className="w-3.5 h-3.5" /> Generate SEO Metadata
              </>
            )}
          </button>
        </form>

        {error && <span className="text-xs text-error-deep font-semibold">{error}</span>}
      </div>

      {/* Generated Results Workspace */}
      {result && (
        <div className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-hairline">
            <span className="text-sm font-bold text-ink font-mono uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-link" />
              Generated SEO Results
            </span>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-body">Video Title</label>
              <button
                onClick={() => copyToClipboard(result.title, "title")}
                className="flex items-center gap-1 text-mute hover:text-ink text-[11px] font-semibold cursor-pointer"
              >
                {copiedField === "title" ? (
                  <>
                    <Check className="w-3 h-3 text-link" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy
                  </>
                )}
              </button>
            </div>
            <input
              type="text"
              value={result.title}
              onChange={(e) => setResult({ ...result, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink font-semibold"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-body">Video Description</label>
              <button
                onClick={() => copyToClipboard(result.description, "desc")}
                className="flex items-center gap-1 text-mute hover:text-ink text-[11px] font-semibold cursor-pointer"
              >
                {copiedField === "desc" ? (
                  <>
                    <Check className="w-3 h-3 text-link" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={6}
              value={result.description}
              onChange={(e) => setResult({ ...result, description: e.target.value })}
              className="w-full p-3 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-body">Tags (Comma-separated)</label>
                <button
                  onClick={() => copyToClipboard(result.tags.join(", "), "tags")}
                  className="flex items-center gap-1 text-mute hover:text-ink text-[11px] font-semibold cursor-pointer"
                >
                  {copiedField === "tags" ? (
                    <>
                      <Check className="w-3 h-3 text-link" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy
                    </>
                  )}
                </button>
              </div>
              <input
                type="text"
                value={result.tags.join(", ")}
                onChange={(e) =>
                  setResult({ ...result, tags: e.target.value.split(",").map((t) => t.trim()) })
                }
                className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink font-mono"
              />
            </div>

            {/* Hashtags */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-body">Hashtags</label>
                <button
                  onClick={() => copyToClipboard(result.hashtags.map((h) => `#${h.replace("#", "")}`).join(" "), "hashtags")}
                  className="flex items-center gap-1 text-mute hover:text-ink text-[11px] font-semibold cursor-pointer"
                >
                  {copiedField === "hashtags" ? (
                    <>
                      <Check className="w-3 h-3 text-link" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy
                    </>
                  )}
                </button>
              </div>
              <input
                type="text"
                value={result.hashtags.map((h) => `#${h.replace("#", "")}`).join(" ")}
                onChange={(e) =>
                  setResult({
                    ...result,
                    hashtags: e.target.value.split(/\s+/).map((h) => h.replace("#", "").trim()),
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink font-mono"
              />
            </div>
          </div>

          {/* Pinned Comment */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-body">Pinned Comment</label>
              <button
                onClick={() => copyToClipboard(result.pinnedComment, "pinned")}
                className="flex items-center gap-1 text-mute hover:text-ink text-[11px] font-semibold cursor-pointer"
              >
                {copiedField === "pinned" ? (
                  <>
                    <Check className="w-3 h-3 text-link" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy
                  </>
                )}
              </button>
            </div>
            <input
              type="text"
              value={result.pinnedComment}
              onChange={(e) => setResult({ ...result, pinnedComment: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink"
            />
          </div>
        </div>
      )}
    </div>
  );
}
