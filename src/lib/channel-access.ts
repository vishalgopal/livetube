import { cookies } from "next/headers";
import { db } from "./db";
import { getSessionUserRole, requireSession } from "./auth-guard";

export async function listAccessibleChannels() {
  const session = await requireSession();
  const role = await getSessionUserRole();

  if (role === "admin") {
    return db.channel.findMany({
      orderBy: { name: "asc" },
    });
  }

  return db.channel.findMany({
    where: {
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getActiveChannelContext() {
  const channels = await listAccessibleChannels();
  const cookieStore = await cookies();
  const selectedSlug = cookieStore.get("selected_channel_slug")?.value;

  let activeChannel = channels.find((channel) => channel.slug === selectedSlug);
  if (!activeChannel && channels.length > 0) {
    activeChannel = channels[0];
  }

  return {
    channels,
    activeChannel: activeChannel || null,
  };
}
