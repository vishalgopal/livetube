"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Radio, UploadCloud } from "lucide-react";
import { createQuickStreamAction } from "@/app/actions/studio";

interface MediaItem {
  id: string;
  title: string;
}

interface InitialQuickStreamValues {
  streamId?: string;
  mediaId?: string;
  thumbnailMediaId?: string;
  title?: string;
  description?: string;
  categoryId?: string;
}

interface QuickStreamFormProps {
  channelId: string;
  videos: MediaItem[];
  images: MediaItem[];
  initialValues?: InitialQuickStreamValues | null;
}

const LIVE_CATEGORIES = [
  { id: "10", label: "Music" },
  { id: "24", label: "Entertainment" },
  { id: "22", label: "People & Blogs" },
  { id: "27", label: "Education" },
] as const;

function normalizeInitialValues(initialValues?: InitialQuickStreamValues | null) {
  return {
    selectedVideoId: initialValues?.mediaId || "",
    selectedImageId: initialValues?.thumbnailMediaId || "",
    title: initialValues?.title || "",
    description: initialValues?.description || "",
    categoryId: initialValues?.categoryId || "10",
  };
}

export default function QuickStreamForm({
  channelId,
  videos,
  images,
  initialValues,
}: QuickStreamFormProps) {
  const normalizedInitialValues = useMemo(
    () => normalizeInitialValues(initialValues),
    [initialValues]
  );
  const [selectedVideoId, setSelectedVideoId] = useState(normalizedInitialValues.selectedVideoId);
  const [selectedImageId, setSelectedImageId] = useState(normalizedInitialValues.selectedImageId);
  const [title, setTitle] = useState(normalizedInitialValues.title);
  const [description, setDescription] = useState(normalizedInitialValues.description);
  const [categoryId, setCategoryId] = useState(normalizedInitialValues.categoryId);
  const [availableImages, setAvailableImages] = useState(images);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [thumbnailUploadError, setThumbnailUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setSelectedVideoId(normalizedInitialValues.selectedVideoId);
    setSelectedImageId(normalizedInitialValues.selectedImageId);
    setTitle(normalizedInitialValues.title);
    setDescription(normalizedInitialValues.description);
    setCategoryId(normalizedInitialValues.categoryId);
    setError("");
    setSuccess(initialValues?.streamId ? "Stream values loaded from history. Adjust anything, then create again." : "");
  }, [initialValues, normalizedInitialValues]);

  useEffect(() => {
    setAvailableImages(images);
  }, [images]);

  const selectedThumbnail = availableImages.find((image) => image.id === selectedImageId) || null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedVideoId || !title.trim()) {
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      await createQuickStreamAction({
        channelId,
        mediaId: selectedVideoId,
        thumbnailMediaId: selectedImageId || null,
        title,
        description,
        categoryId,
      });
      setSuccess("Live stream created. Use Start on the stream card below when you're ready.");
      setSelectedVideoId("");
      setSelectedImageId("");
      setTitle("");
      setDescription("");
      setCategoryId("10");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Unable to create the live stream.");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerThumbnailSelect = () => {
    fileInputRef.current?.click();
  };

  const uploadThumbnail = (file: File) => {
    setIsUploadingThumbnail(true);
    setThumbnailUploadError("");
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("channelId", channelId);
    formData.append("folderId", "root");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media/upload", true);

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        return;
      }

      setIsUploadingThumbnail(false);

      if (xhr.status === 200) {
        try {
          const payload = JSON.parse(xhr.responseText || "{}");
          const media = payload?.media;
          if (!media?.id) {
            throw new Error("Thumbnail upload succeeded but no media record was returned.");
          }

          const uploadedImage = {
            id: String(media.id),
            title: String(media.title || media.originalFilename || file.name),
          };

          setAvailableImages((prev) => {
            const withoutDuplicate = prev.filter((item) => item.id !== uploadedImage.id);
            return [uploadedImage, ...withoutDuplicate];
          });
          setSelectedImageId(uploadedImage.id);
          setSuccess(`Thumbnail "${uploadedImage.title}" uploaded and selected.`);
          router.refresh();
        } catch (uploadError: any) {
          setThumbnailUploadError(uploadError.message || "Uploaded thumbnail could not be selected.");
        }
        return;
      }

      let errorMessage = "Thumbnail upload failed.";
      try {
        const payload = JSON.parse(xhr.responseText || "{}");
        if (payload?.error) {
          errorMessage = String(payload.error);
        }
      } catch (_) {
        if (xhr.status === 413) {
          errorMessage = "Thumbnail is too large for the current request size limit.";
        }
      }

      setThumbnailUploadError(errorMessage);
    };

    xhr.send(formData);
  };

  const handleThumbnailFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    uploadThumbnail(file);
  };

  const handleThumbnailDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    uploadThumbnail(file);
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 bg-canvas border border-hairline rounded-xl flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-ink font-mono uppercase tracking-wider">
            Create Live Stream
          </h3>
          <p className="text-[11px] text-mute">
            Pick media, set title/description, attach thumbnail, then create the YouTube live entry.
          </p>
        </div>
        {initialValues?.streamId && (
          <span className="rounded-full border border-link bg-link-bg-soft px-2.5 py-1 text-[10px] font-bold uppercase text-link-deep">
            Reusing History
          </span>
        )}
      </div>

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

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-body">Select Video or Audio Asset</label>
        <select
          required
          value={selectedVideoId}
          onChange={(e) => setSelectedVideoId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink cursor-pointer"
        >
          <option value="" disabled>
            -- Choose Asset --
          </option>
          {videos.map((video) => (
            <option key={video.id} value={video.id}>
              {video.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-body">Live Stream Title</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter live stream title"
          className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-body">Description</label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter live stream description"
          className="w-full p-3 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink font-sans"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-body">Thumbnail (Optional)</label>
        <select
          value={selectedImageId}
          onChange={(e) => setSelectedImageId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink cursor-pointer"
        >
          <option value="">-- No custom thumbnail --</option>
          {availableImages.map((image) => (
            <option key={image.id} value={image.id}>
              {image.title}
            </option>
          ))}
        </select>
      </div>

      {selectedThumbnail && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-mute">
            Thumbnail Preview
          </span>
          <div className="overflow-hidden rounded-xl border border-hairline bg-canvas-soft/40">
            <Image
              src={`/api/media/file/${selectedThumbnail.id}`}
              alt={selectedThumbnail.title}
              width={640}
              height={360}
              unoptimized
              className="h-40 w-full object-cover"
            />
          </div>
          <span className="text-[11px] text-mute">{selectedThumbnail.title}</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-body">Upload Thumbnail Here</span>
          {isUploadingThumbnail && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-mute">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
            </span>
          )}
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleThumbnailDrop}
          onClick={triggerThumbnailSelect}
          className={`rounded-xl border-2 border-dashed p-4 transition-colors cursor-pointer ${
            isDragOver
              ? "border-primary bg-canvas-soft-2"
              : "border-hairline bg-canvas-soft/30 hover:border-hairline-strong"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleThumbnailFileChange}
          />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-canvas">
              {isUploadingThumbnail ? (
                <Loader2 className="h-4 w-4 animate-spin text-mute" />
              ) : (
                <UploadCloud className="h-4 w-4 text-mute" />
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-ink">
                Drag and drop a thumbnail, or click to upload
              </span>
              <span className="text-[11px] text-mute">
                JPG, PNG, WEBP supported. It will be added to this channel and selected automatically.
              </span>
            </div>
          </div>
        </div>

        {thumbnailUploadError && (
          <div className="flex items-start gap-2 rounded-lg border border-error-soft bg-error-soft/20 p-3 text-xs text-error-deep">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{thumbnailUploadError}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-body">Made for Kids</label>
          <input
            type="text"
            value="No"
            readOnly
            className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas-soft text-xs text-ink"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-body">Type</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink cursor-pointer"
          >
            {LIVE_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-[11px] text-mute">
        This works like OBS: create the stream entry with thumbnail and defaults first, then start it from the queue below.
      </p>

      <button
        type="submit"
        disabled={isLoading || isUploadingThumbnail || !selectedVideoId || !title.trim()}
        className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-primary hover:bg-ink text-on-primary text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Creating Live Stream...
          </>
        ) : (
          <>
            <Radio className="w-4 h-4" /> Create Stream
          </>
        )}
      </button>

      <div className="rounded-xl border border-hairline bg-canvas-soft/30 p-3">
        <div className="mb-2 flex items-center gap-2">
          <ImagePlus className="h-4 w-4 text-mute" />
          <span className="text-xs font-semibold text-ink">Reuse From History</span>
        </div>
        <p className="text-[11px] text-mute">
          Click any item in Recent Stream History below to load its media, title, description, thumbnail, and type back into this form.
        </p>
      </div>
    </form>
  );
}
