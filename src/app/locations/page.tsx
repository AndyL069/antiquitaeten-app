import { Header } from "@/components/header";
import { LocationsManager } from "@/components/locations-manager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const locations = await prisma.location.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true, children: true } } },
  });

  const nodes = locations.map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description,
    parentId: l.parentId,
    itemCount: l._count.items,
    childCount: l._count.children,
  }));

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold">Standorte</h1>
        <p className="mt-1 text-muted-foreground">
          Räume, Schränke und Kisten, in denen die Objekte aufbewahrt werden.
        </p>
        <div className="mt-6">
          <LocationsManager locations={nodes} />
        </div>
      </main>
    </>
  );
}
