import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { ItemForm } from "@/components/item-form";
import { prisma } from "@/lib/prisma";
import { locationOptions } from "@/lib/locations";

export const dynamic = "force-dynamic";

export default async function EditItemPage({ params }: PageProps<"/items/[id]/edit">) {
  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) notFound();

  const locations = await prisma.location.findMany({
    select: { id: true, name: true, parentId: true },
  });
  const options = locationOptions(locations);

  const initial = {
    inventoryNumber: item.inventoryNumber ?? "",
    name: item.name,
    category: item.category ?? "",
    era: item.era ?? "",
    origin: item.origin ?? "",
    material: item.material ?? "",
    dimensions: item.dimensions ?? "",
    condition: item.condition ?? "",
    description: item.description ?? "",
    context: item.context ?? "",
    estimatedValue: "",
    valueNote: "",
    acquisitionDate: item.acquisitionDate ? item.acquisitionDate.toISOString().slice(0, 10) : "",
    locationId: item.locationId ?? "",
  };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold">Objekt bearbeiten</h1>
        <p className="mt-1 text-muted-foreground">{item.name}</p>
        <div className="mt-6">
          <ItemForm mode="edit" itemId={item.id} initial={initial} locations={options} />
        </div>
      </main>
    </>
  );
}
