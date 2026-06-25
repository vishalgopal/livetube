import OpenAI from "openai";
import { db } from "./db";

let openaiInstance: OpenAI | null = null;

function getOpenAiClient() {
  if (!openaiInstance) {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "dummy-key-for-build-purposes";
    openaiInstance = new OpenAI({
      baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      apiKey: apiKey,
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "LiveTube Dashboard",
      },
    });
  }
  return openaiInstance;
}

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

interface GeneratedMetadata {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  pinnedComment: string;
}

/**
 * Generate YouTube Metadata using OpenRouter
 */
export async function generateYoutubeMetadata(
  topic: string,
  templatePrompt: string,
  descriptionStructure?: string,
  ctaText?: string
): Promise<GeneratedMetadata> {
  const systemPrompt = `You are a professional YouTube SEO manager. You generate highly optimized titles, descriptions, tags, hashtags, and pinned comments.
You MUST respond with a valid JSON object matching the following structure:
{
  "title": "Optimized YouTube Video Title",
  "description": "Engaging video description containing keywords, structure, and call-to-actions.",
  "tags": ["tag1", "tag2", "tag3"],
  "hashtags": ["hashtag1", "hashtag2"],
  "pinnedComment": "An engaging question or call-to-action for the pinned comment."
}
Do not include any explanation, markdown formatting blocks (like \`\`\`json) outside of the raw JSON string itself. Just return the raw JSON.`;

  const userPrompt = `
Topic: "${topic}"
Prompt Instructions: "${templatePrompt}"
${descriptionStructure ? `Description Structure: "${descriptionStructure}"` : ""}
${ctaText ? `Call-To-Action (CTA): "${ctaText}"` : ""}

Generate optimized metadata for this video:
`;

  try {
    const response = await getOpenAiClient().chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content?.trim() || "{}";
    
    // Clean codeblock markdown wrap if present
    const cleanedContent = content
      .replace(/^```json/i, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();

    const parsed: GeneratedMetadata = JSON.parse(cleanedContent);

    return {
      title: parsed.title || topic,
      description: parsed.description || "",
      tags: parsed.tags || [],
      hashtags: parsed.hashtags || [],
      pinnedComment: parsed.pinnedComment || "",
    };
  } catch (error) {
    console.error("AI Metadata generation failed:", error);
    throw new Error("Failed to generate metadata using AI. Check API credentials or OpenRouter availability.");
  }
}

/**
 * Content Reuse Assistant: Find similar YouTubeUploads in the channel
 */
export async function findSimilarUploads(channelId: string, query: string) {
  // Simple token-based title search in Prisma
  const keywords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((k) => k.length > 2); // filter short words

  if (keywords.length === 0) {
    return [];
  }

  // Find uploads for this channel
  const uploads = await db.youTubeUpload.findMany({
    where: {
      channelId,
      status: "PUBLISHED",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  // Score uploads based on keyword matches
  const scored = uploads
    .map((upload) => {
      const titleLower = upload.title.toLowerCase();
      let matches = 0;
      keywords.forEach((keyword) => {
        if (titleLower.includes(keyword)) {
          matches++;
        }
      });
      const score = matches / keywords.length;
      return { upload, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.upload);

  return scored;
}
