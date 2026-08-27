import { Header } from "@/components/header";
import { ItemForm } from "@/components/item-form";
import { prisma } from "@/lib/prisma";
import { locationOptions } from "@/lib/locations";

export const dynamic = "force-dynamic";

export default async function NewItemPage() {
  const locations = await prisma.location.findMany({
    select: { id: true, name: true, parentId: true },
  });
  const options = locationOptions(locations);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold">Neues Objekt</h1>
        <p className="mt-1 text-muted-foreground">Ein geerbtes Stück in der Sammlung erfassen.</p>
        <div className="mt-6">
          <ItemForm mode="new" locations={options} />
        </div>
      </main>
    </>
  );
}
