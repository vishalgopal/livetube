import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  BrainCircuit,
  Plus,
  Trash2,
  Copy,
  Star,
  StarOff,
  Tags,
} from "lucide-react";
import {
  createTemplateAction,
  duplicateTemplateAction,
  toggleFavoriteTemplateAction,
  deleteTemplateAction,
} from "@/app/actions/templates";
import MetadataGenerator from "@/components/metadata-generator";

export default async function AiTemplatesPage() {
  const cookieStore = await cookies();
  const selectedSlug = cookieStore.get("selected_channel_slug")?.value;

  const channels = await db.channel.findMany({ orderBy: { name: "asc" } });
  let activeChannel = channels.find((c) => c.slug === selectedSlug);
  if (!activeChannel && channels.length > 0) {
    activeChannel = channels[0];
  }

  if (!activeChannel) {
    return <div className="text-mute">No channel selected.</div>;
  }

  // Fetch templates for the channel or shared templates (channelId is null)
  const templates = await db.aiTemplate.findMany({
    where: {
      OR: [
        { channelId: activeChannel.id },
        { channelId: null },
      ],
    },
    orderBy: [
      { isFavorite: "desc" },
      { createdAt: "desc" },
    ],
  });

  return (
    <div className="flex flex-col gap-6 md:gap-8 h-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">AI Template Library</h1>
        <p className="text-sm text-mute">
          Configure prompt templates to automatically generate YouTube titles and descriptions for {activeChannel.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8 items-start">
        {/* Left Column Templates Library List */}
        <div className="lg:col-span-1 p-4 bg-canvas border border-hairline rounded-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink font-mono uppercase tracking-wider">
              Saved Prompt Templates
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {templates.length === 0 ? (
              <span className="text-xs text-mute font-medium py-2">No templates configured yet.</span>
            ) : (
              templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-hairline/60 bg-canvas-soft-2/50 text-sm font-semibold hover:border-hairline transition-all group"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="truncate text-ink font-bold text-xs" title={tpl.name}>
                      {tpl.name}
                    </span>
                    <span className="text-[9px] text-mute uppercase font-mono tracking-wider">
                      {tpl.category.toLowerCase()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <form
                      action={async () => {
                        "use server";
                        await toggleFavoriteTemplateAction(tpl.id);
                      }}
                    >
                      <button
                        type="submit"
                        title={tpl.isFavorite ? "Unfavorite" : "Favorite"}
                        className="p-1 rounded hover:bg-canvas text-mute hover:text-ink transition-colors cursor-pointer"
                      >
                        <Star className={`w-3.5 h-3.5 ${tpl.isFavorite ? "fill-link text-link" : ""}`} />
                      </button>
                    </form>

                    <form
                      action={async () => {
                        "use server";
                        await duplicateTemplateAction(tpl.id);
                      }}
                    >
                      <button
                        type="submit"
                        title="Duplicate"
                        className="p-1 rounded hover:bg-canvas text-mute hover:text-ink transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </form>

                    {tpl.channelId && (
                      <form
                        action={async () => {
                          "use server";
                          await deleteTemplateAction(tpl.id);
                        }}
                      >
                        <button
                          type="submit"
                          title="Delete"
                          className="p-1 rounded hover:bg-canvas text-mute hover:text-error transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Create Template Form */}
          <form
            action={async (formData) => {
              "use server";
              const name = formData.get("name") as string;
              const category = formData.get("category") as any;
              const prompt = formData.get("prompt") as string;
              const defaultTagsStr = formData.get("defaultTags") as string;
              const defaultHashtagsStr = formData.get("defaultHashtags") as string;
              const descStruct = formData.get("descStruct") as string;
              const ctaText = formData.get("ctaText") as string;

              const defaultTags = defaultTagsStr
                ? defaultTagsStr.split(",").map((t) => t.trim())
                : [];
              const defaultHashtags = defaultHashtagsStr
                ? defaultHashtagsStr.split(/\s+/).map((h) => h.replace("#", "").trim())
                : [];

              if (name && prompt) {
                await createTemplateAction(
                  activeChannel!.id,
                  name,
                  category,
                  prompt,
                  defaultTags,
                  defaultHashtags,
                  descStruct,
                  ctaText
                );
              }
            }}
            className="flex flex-col gap-3 pt-4 border-t border-hairline"
          >
            <span className="text-xs font-bold text-ink font-mono uppercase tracking-wider">
              Add Prompt Template
            </span>

            <div className="flex flex-col gap-1.5">
              <input
                name="name"
                placeholder="Template Title"
                required
                className="w-full px-2.5 py-1.5 rounded-md border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <select
                name="category"
                defaultValue="CUSTOM"
                className="w-full px-2 py-1.5 rounded-md border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink cursor-pointer"
              >
                <option value="DEVOTIONAL">Devotional</option>
                <option value="MEDITATION">Meditation</option>
                <option value="HEALING">Healing</option>
                <option value="SLEEP">Sleep</option>
                <option value="STUDY">Study</option>
                <option value="AMBIENT">Ambient</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <textarea
                name="prompt"
                placeholder="Prompt instructions (e.g. Generate title matching Bhakti tones and describe the mantra details...)"
                required
                rows={3}
                className="w-full px-2.5 py-1.5 rounded-md border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <input
                name="defaultTags"
                placeholder="Default Tags (comma separated)"
                className="w-full px-2.5 py-1.5 rounded-md border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <input
                name="defaultHashtags"
                placeholder="Default Hashtags (space separated)"
                className="w-full px-2.5 py-1.5 rounded-md border border-hairline bg-canvas text-xs focus:outline-none focus:border-hairline-strong text-ink"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-primary hover:bg-ink text-on-primary text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Save Template
            </button>
          </form>
        </div>

        {/* Right Column Interactive Workspace */}
        <div className="lg:col-span-3">
          <MetadataGenerator
            templates={templates.map((t) => ({
              id: t.id,
              name: t.name,
              category: t.category,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
