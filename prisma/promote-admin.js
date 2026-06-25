const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    throw new Error("Usage: npm run auth:promote-admin -- <email>");
  }

  const existingUser = await prisma.authUser.findUnique({
    where: { email },
    select: { email: true, role: true },
  });

  if (!existingUser) {
    throw new Error(
      `No auth user exists for ${email}. Create the account first at /sign-up, then run this command again.`,
    );
  }

  if (existingUser.role === "admin") {
    console.log(`${existingUser.email} is already an admin.`);
    return;
  }

  const user = await prisma.authUser.update({
    where: { email },
    data: { role: "admin" },
  });

  console.log(`Promoted ${user.email} to admin.`);
}

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
