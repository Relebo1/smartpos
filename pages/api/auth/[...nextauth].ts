import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const PLATFORM_ROLES = ["SUPER_ADMIN", "SUPPORT_ADMIN"];

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { organization: true },
        });

        if (!user) throw new Error("Invalid email or password");
        if (!user.isActive) throw new Error("Account is inactive");

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) throw new Error("Invalid email or password");

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId:   user.organizationId   ?? undefined,
          organizationName: user.organization?.name ?? undefined,
          permissions:      (user.permissions as string[]) ?? [],
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id             = user.id;
        token.role           = user.role;
        token.organizationId   = user.organizationId;
        token.organizationName = user.organizationName;
        token.permissions      = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id             = token.id;
      session.user.role           = token.role;
      session.user.organizationId   = token.organizationId;
      session.user.organizationName = token.organizationName;
      session.user.permissions      = token.permissions;
      return session;
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};

export { PLATFORM_ROLES };
export default NextAuth(authOptions);
