import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"

// La raíz no tiene contenido propio: manda al dashboard si hay sesión y al
// login si no. Mismo patrón que src/app/dashboard/layout.tsx.
export default async function Home() {
  const session = await getServerSession(authOptions)

  redirect(session ? "/dashboard" : "/auth/login")
}
