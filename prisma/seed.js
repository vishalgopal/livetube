const { ChannelStatus, PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const channels = [
  {
    name: "Bhakti",
    slug: "bhakti",
    youtubeChannelId: "UC_BHAKTI_PLACEHOLDER",
    status: ChannelStatus.DISCONNECTED,
    defaultPrivacy: "private",
  },
  {
    name: "RaagaX",
    slug: "raagax",
    youtubeChannelId: "UC_RAAGAX_PLACEHOLDER",
    status: ChannelStatus.DISCONNECTED,
    defaultPrivacy: "private",
  },
];

async function main() {
  for (const channel of channels) {
    await prisma.channel.upsert({
      where: { slug: channel.slug },
      update: {
        name: channel.name,
        defaultPrivacy: channel.defaultPrivacy,
      },
      create: channel,
    });
  }

  const count = await prisma.channel.count();
  console.log(`Seeded ${channels.length} default channels. Total channels: ${count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
