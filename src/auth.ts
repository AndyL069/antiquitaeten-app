import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const authentikProvider = process.env.AUTHENTIK_ISSUER
  ? [
      {
        id: "authentik",
        name: "Authentik",
        type: "oidc" as const,
        issuer: process.env.AUTHENTIK_ISSUER,
        clientId: process.env.AUTHENTIK_CLIENT_ID,
        clientSecret: process.env.AUTHENTIK_CLIENT_SECRET,
      },
    ]
  : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    ...authentikProvider,
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email).toLowerCase().trim() },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(String(credentials.password), user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user && account?.provider !== "authentik") {
        token.id = user.id;
        token.role = user.role;
      }
      if (account?.provider === "authentik" && profile?.email) {
        const email = String(profile.email).toLowerCase().trim();
        let dbUser = await prisma.user.findUnique({ where: { email } });
        if (!dbUser) {
          const userCount = await prisma.user.count();
          dbUser = await prisma.user.create({
            data: { email, name: (profile.name as string) || null, passwordHash: "", role: userCount === 0 ? "ADMIN" : "MEMBER", authProvider: "authentik" },
          });
        }
        token.id = dbUser.id;
        token.role = dbUser.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "MEMBER";
      }
      return session;
    },
  },
});
