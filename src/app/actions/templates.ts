"use server";

import { db } from "@/lib/db";
import { generateYoutubeMetadata } from "@/lib/ai";
import { revalidatePath } from "next/cache";

/**
 * Save a new AI Template
 */
export async function createTemplateAction(
  channelId: string,
  name: string,
  category: "DEVOTIONAL" | "MEDITATION" | "HEALING" | "SLEEP" | "STUDY" | "AMBIENT" | "CUSTOM",
  prompt: string,
  defaultTags: string[],
  defaultHashtags: string[],
  descriptionStructure?: string,
  ctaText?: string
) {
  try {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    await db.aiTemplate.create({
      data: {
        channelId,
        name,
        slug,
        category,
        prompt,
        defaultTags,
        defaultHashtags,
        descriptionStructure: descriptionStructure || null,
        ctaText: ctaText || null,
      },
    });

    revalidatePath("/ai-templates");
  } catch (error: any) {
    console.error("Failed to create template:", error);
    throw new Error(error.message || "Failed to create template.");
  }
}

/**
 * Duplicate a template
 */
export async function duplicateTemplateAction(templateId: string) {
  try {
    const src = await db.aiTemplate.findUnique({ where: { id: templateId } });
    if (!src) throw new Error("Template not found.");

    const name = `${src.name} (Copy)`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    await db.aiTemplate.create({
      data: {
        channelId: src.channelId,
        name,
        slug,
        category: src.category,
        prompt: src.prompt,
        defaultTags: src.defaultTags,
        defaultHashtags: src.defaultHashtags,
        descriptionStructure: src.descriptionStructure,
        ctaText: src.ctaText,
      },
    });

    revalidatePath("/ai-templates");
  } catch (error: any) {
    console.error("Duplicate template failed:", error);
    throw new Error(error.message || "Failed to duplicate.");
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavoriteTemplateAction(templateId: string) {
  try {
    const template = await db.aiTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error("Template not found.");

    await db.aiTemplate.update({
      where: { id: templateId },
      data: { isFavorite: !template.isFavorite },
    });

    revalidatePath("/ai-templates");
  } catch (error: any) {
    console.error("Failed to toggle favorite:", error);
    throw new Error(error.message || "Toggle favorite failed.");
  }
}

/**
 * Delete a template
 */
export async function deleteTemplateAction(templateId: string) {
  try {
    await db.aiTemplate.delete({ where: { id: templateId } });
    revalidatePath("/ai-templates");
  } catch (error: any) {
    console.error("Failed to delete template:", error);
    throw new Error(error.message || "Failed to delete.");
  }
}

/**
 * Trigger OpenRouter metadata generation server action
 * This action returns the generated metadata directly to the caller
 */
export async function generateMetadataAction(topic: string, templateId: string) {
  try {
    const template = await db.aiTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error("Template not found.");

    // Call AI utility
    const result = await generateYoutubeMetadata(
      topic,
      template.prompt,
      template.descriptionStructure || undefined,
      template.ctaText || undefined
    );

    // Merge default tags/hashtags from template into results
    const combinedTags = Array.from(new Set([...(template.defaultTags || []), ...(result.tags || [])]));
    const combinedHashtags = Array.from(new Set([...(template.defaultHashtags || []), ...(result.hashtags || [])]));

    return {
      success: true,
      data: {
        title: result.title,
        description: result.description,
        tags: combinedTags,
        hashtags: combinedHashtags,
        pinnedComment: result.pinnedComment,
      },
    };
  } catch (error: any) {
    console.error("Metadata generation action error:", error);
    return {
      success: false,
      error: error.message || "Failed to generate metadata using OpenRouter.",
    };
  }
}
