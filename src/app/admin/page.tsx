import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Header } from "@/components/header";
import { UsersManager } from "@/components/users-manager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  const list = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold">Verwaltung</h1>
        <p className="mt-1 text-muted-foreground">
          Familienmitglieder verwalten. Der erste registrierte Benutzer ist automatisch Administrator.
        </p>
        <div className="mt-6">
          <UsersManager users={list} currentUserId={session!.user.id} />
        </div>
      </main>
    </>
  );
}
