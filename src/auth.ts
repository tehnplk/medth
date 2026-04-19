import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { query } from "@/lib/db";

type UserRow = {
  id: number;
  username: string;
  display_name: string;
  password_hash: string;
  role: "admin" | "staff" | "user";
  is_active: number;
};

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Admin Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username;
        const password = credentials?.password;

        if (typeof username !== "string" || typeof password !== "string") {
          return null;
        }

        const rows = await query<UserRow[]>(
          `
            SELECT id, username, display_name, password_hash, role, is_active
            FROM users
            WHERE username = ?
            LIMIT 1
          `,
          [username],
        );

        const user = rows[0];
        if (!user) {
          return null;
        }

        if (user.is_active !== 1) {
          throw new Error("User account is suspended");
        }

        const isValidPassword = await compare(password, user.password_hash);
        if (!isValidPassword) {
          return null;
        }

        return {
          id: String(user.id),
          name: user.display_name,
          email: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "user";
        token.id = (user as { id?: string }).id ?? "";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string | undefined;
        (session.user as { id?: string }).id = token.id as string | undefined;
      }
      return session;
    },
  },
};
