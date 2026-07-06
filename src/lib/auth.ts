import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { db } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  user: {
    modelName: "AuthUser",
  },
  session: {
    modelName: "AuthSession",
  },
  account: {
    modelName: "AuthAccount",
  },
  verification: {
    modelName: "AuthVerification",
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.ALLOW_PUBLIC_SIGNUP !== "true",
  },
  // Set custom user fields if any. Better Auth automatically manages role
  // because we have "role" String? in AuthUser.
});
