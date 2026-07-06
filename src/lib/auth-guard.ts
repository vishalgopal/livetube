import { headers } from "next/headers";
import { auth } from "./auth";
import { db } from "./db";

export async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}

export async function getSessionUserRole() {
  const session = await requireSession();
  const email = session.user.email;

  if (!email) {
    return "operator";
  }

  const user = await db.authUser.findUnique({
    where: { email },
    select: { role: true },
  });

  return String(user?.role || "operator").toLowerCase();
}

export async function requireAdminSession() {
  const session = await requireSession();
  const role = await getSessionUserRole();

  if (role !== "admin") {
    throw new Error("Forbidden");
  }

  return session;
}

export async function requireChannelById(channelId: string) {
  const session = await requireSession();
  const role = await getSessionUserRole();

  const channel = await db.channel.findFirst({
    where: {
      id: channelId,
      ...(role === "admin"
        ? {}
        : {
            members: {
              some: {
                userId: session.user.id,
              },
            },
          }),
    },
  });

  if (!channel) {
    throw new Error("Channel not found.");
  }

  return channel;
}

export async function requireChannelBySlug(slug: string) {
  const session = await requireSession();
  const role = await getSessionUserRole();

  const channel = await db.channel.findFirst({
    where: {
      slug,
      ...(role === "admin"
        ? {}
        : {
            members: {
              some: {
                userId: session.user.id,
              },
            },
          }),
    },
  });

  if (!channel) {
    throw new Error("Channel not found.");
  }

  return channel;
}

export async function requireMediaById(mediaId: string) {
  const media = await db.media.findUnique({
    where: { id: mediaId },
  });

  if (!media) {
    throw new Error("Media not found.");
  }

  await requireChannelById(media.channelId);
  return media;
}

export async function requireFolderById(folderId: string) {
  const folder = await db.folder.findUnique({
    where: { id: folderId },
  });

  if (!folder) {
    throw new Error("Folder not found.");
  }

  await requireChannelById(folder.channelId);
  return folder;
}

export async function requirePlaylistById(playlistId: string) {
  const playlist = await db.playlist.findUnique({
    where: { id: playlistId },
  });

  if (!playlist) {
    throw new Error("Playlist not found.");
  }

  await requireChannelById(playlist.channelId);
  return playlist;
}

export async function requirePlaylistItemById(itemId: string) {
  const item = await db.playlistItem.findUnique({
    where: { id: itemId },
  });

  if (!item) {
    throw new Error("Playlist item not found.");
  }

  const playlist = await db.playlist.findUnique({
    where: { id: item.playlistId },
    select: { channelId: true },
  });

  if (!playlist) {
    throw new Error("Playlist not found.");
  }

  await requireChannelById(playlist.channelId);
  return item;
}

export async function requireStreamById(streamId: string) {
  const stream = await db.stream.findUnique({
    where: { id: streamId },
  });

  if (!stream) {
    throw new Error("Stream not found.");
  }

  await requireChannelById(stream.channelId);
  return stream;
}

export async function requireCommentById(commentId: string) {
  const comment = await db.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    throw new Error("Comment not found.");
  }

  await requireChannelById(comment.channelId);
  return comment;
}

export async function requireTemplateById(templateId: string) {
  await requireSession();

  const template = await db.aiTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    throw new Error("Template not found.");
  }

  if (template.channelId) {
    await requireChannelById(template.channelId);
  }

  return template;
}

export function assertSameChannel(actualChannelId: string, expectedChannelId: string, label: string) {
  if (actualChannelId !== expectedChannelId) {
    throw new Error(`${label} does not belong to the selected channel.`);
  }
}
