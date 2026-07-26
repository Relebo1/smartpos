import NextAuth from "next-auth";

export type UserRole = "SUPER_ADMIN" | "SUPPORT_ADMIN" | "ORGANIZATION_ADMIN" | "CASHIER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      organizationId?: number;
      organizationName?: string;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    organizationId?: number;
    organizationName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    organizationId?: number;
    organizationName?: string;
  }
}
