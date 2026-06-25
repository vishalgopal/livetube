"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2, PlayCircle, Image as ImageIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { publishVideoAction } from "@/app/actions/publishing";

interface MediaItem {
  id: string;
  title: string;
}

interface PublishingFormProps {
  channelId: string;
  videos: MediaItem[];
  images: MediaItem[];
}

export default function PublishingForm({ channelId, videos, images }: PublishingFormProps) {
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [selectedImageId, setSelectedImageId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [hashtagsStr, setHashtagsStr] = useState("");
  const [pinnedComment, setPinnedComment] = useState("");
  const [privacy, setPrivacy] = useState<"PUBLIC" | "PRIVATE" | "UNLISTED">("PRIVATE");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideoId || !title) return;

    setIsLoading(true);
    setError("");
    setSuccess("");

    const tags = tagsStr ? tagsStr.split(",").map((t) => t.trim()) : [];
    const hashtags = hashtagsStr
      ? hashtagsStr.split(/\s+/).map((h) => h.replace("#", "").trim())
      : [];

    try {
      const res = await publishVideoAction({
        channelId,
        mediaId: selectedVideoId,
        thumbnailMediaId: selectedImageId || null,
        title,
        description,
        tags,
        hashtags,
        pinnedComment: pinnedComment || null,
        privacy,
      });

      if (res.success) {
        setSuccess(`Video published successfully! YouTube ID: ${res.youtubeVideoId}`);
        // Reset form
        setSelectedVideoId("");
        setSelectedImageId("");
        setTitle("");
        setDescription("");
        setTagsStr("");
        setHashtagsStr("");
        setPinnedComment("");
        router.refresh();
      } else {
        setError(res.error || "Failed to publish video.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-4">
      <h3 className="text-sm font-bold text-ink font-mono uppercase tracking-wider">
        Publish Video Settings
      </h3>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-error-soft/20 border border-error-soft text-error-deep text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-link-bg-soft border border-link text-link-deep text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Select Video */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-body">Select Video Asset</label>
        <select
          required
          value={selectedVideoId}
          onChange={(e) => setSelectedVideoId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink cursor-pointer"
        >
          <option value="" disabled>
            -- Choose Video --
          </option>
          {videos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.title}
            </option>
          ))}
        </select>
      </div>

      {/* Select Thumbnail */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-body">Select Thumbnail Image (Optional)</label>
        <select
          value={selectedImageId}
          onChange={(e) => setSelectedImageId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink cursor-pointer"
        >
          <option value="">-- No custom thumbnail (use YouTube generated) --</option>
          {images.map((img) => (
            <option key={img.id} value={img.id}>
              {img.title}
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-body">YouTube Video Title</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter optimized YouTube title"
          className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-body">Description</label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter video description (can include links & timestamps)"
          className="w-full p-3 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink font-sans"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tags */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-body">Tags (comma separated)</label>
          <input
            type="text"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="bhajan, mantra, sleep, raga"
            className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink"
          />
        </div>

        {/* Hashtags */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-body">Hashtags (space separated)</label>
          <input
            type="text"
            value={hashtagsStr}
            onChange={(e) => setHashtagsStr(e.target.value)}
            placeholder="#sleep #music"
            className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink"
          />
        </div>
      </div>

      {/* Pinned Comment */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-body">Pinned Comment Text (Optional)</label>
        <input
          type="text"
          value={pinnedComment}
          onChange={(e) => setPinnedComment(e.target.value)}
          placeholder="Write comment to pin (e.g. Subscribe for weekly updates!)"
          className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink"
        />
      </div>

      {/* Privacy */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-body">Privacy Visibility</label>
        <select
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value as any)}
          className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink cursor-pointer"
        >
          <option value="PUBLIC">Public (Publish instantly)</option>
          <option value="UNLISTED">Unlisted</option>
          <option value="PRIVATE">Private (Draft mode)</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isLoading || !selectedVideoId || !title}
        className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-primary hover:bg-ink text-on-primary text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Uploading to YouTube...
          </>
        ) : (
          <>
            <UploadCloud className="w-4 h-4" /> Publish Video
          </>
        )}
      </button>
    </form>
  );
}
