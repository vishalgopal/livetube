"use server";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

interface ChannelUpsertParams {
  channelId?: string;
  name: string;
  slug?: string;
  youtubeChannelId: string;
  defaultPrivacy?: string | null;
  defaultCategoryId?: string | null;
  defaultStreamKey?: string | null;
  defaultTags?: string[];
}

interface ChannelMemberUpsertParams {
  channelId: string;
  userId: string;
  role: "MANAGER" | "OPERATOR";
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

function normalizeTags(tags?: string[]) {
  return (tags || [])
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function upsertChannelAction(params: ChannelUpsertParams) {
  await requireAdminSession();

  const name = params.name.trim();
  const slug = normalizeSlug(params.slug || params.name);
  const youtubeChannelId = params.youtubeChannelId.trim();

  if (!name) {
    throw new Error("Channel name is required.");
  }

  if (!slug) {
    throw new Error("Channel slug is required.");
  }

  if (!youtubeChannelId) {
    throw new Error("YouTube channel ID is required.");
  }

  const payload = {
    name,
    slug,
    youtubeChannelId,
    defaultPrivacy: params.defaultPrivacy?.trim() || "private",
    defaultCategoryId: params.defaultCategoryId?.trim() || null,
    defaultStreamKey: params.defaultStreamKey?.trim() || null,
    defaultTags: normalizeTags(params.defaultTags),
  };

  if (params.channelId) {
    await db.channel.update({
      where: { id: params.channelId },
      data: payload,
    });
  } else {
    await db.channel.create({
      data: {
        ...payload,
        status: "DISCONNECTED",
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/channels");
}

export async function disconnectChannelAction(channelId: string) {
  await requireAdminSession();

  await db.channel.update({
    where: { id: channelId },
    data: {
      status: "DISCONNECTED",
      oauthAccessToken: null,
      oauthRefreshToken: null,
      oauthScope: null,
      oauthTokenExpiresAt: null,
      lastSyncedAt: null,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/channels");
}

export async function upsertChannelMemberAction(params: ChannelMemberUpsertParams) {
  await requireAdminSession();

  await db.channelMember.upsert({
    where: {
      channelId_userId: {
        channelId: params.channelId,
        userId: params.userId,
      },
    },
    update: {
      role: params.role,
    },
    create: {
      channelId: params.channelId,
      userId: params.userId,
      role: params.role,
    },
  });

  revalidatePath("/admin");
}

export async function removeChannelMemberAction(memberId: string) {
  await requireAdminSession();

  await db.channelMember.delete({
    where: { id: memberId },
  });

  revalidatePath("/admin");
}

export async function updateUserRoleAction(userId: string, role: "admin" | "operator") {
  await requireAdminSession();

  await db.authUser.update({
    where: { id: userId },
    data: { role },
  });

  revalidatePath("/admin");
}
