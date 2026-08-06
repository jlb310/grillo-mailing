import "next-auth";

declare module "next-auth" {
  interface User {
    role: "SUPER_ADMIN" | "ADMIN";
    empresaId?: string;
  }

  interface Session {
    user: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role: "SUPER_ADMIN" | "ADMIN";
      empresaId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "SUPER_ADMIN" | "ADMIN";
    empresaId?: string;
  }
}
