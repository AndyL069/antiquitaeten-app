import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/header";
import { DeleteItemButton } from "@/components/delete-item-button";
import { PhotoManager } from "@/components/photo-manager";
import { AppraisalsSection } from "@/components/appraisals-section";
import { SalesSection } from "@/components/sales-section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { uploadUrl } from "@/lib/upload-url";
import { formatDate } from "@/lib/items";
import { ImageOffIcon, LandmarkIcon, PencilIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ItemPage({ params }: PageProps<"/items/[id]">) {
  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      location: true,
      photos: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      appraisals: { orderBy: { appraisalDate: "desc" } },
      sales: { orderBy: { soldAt: "desc" } },
    },
  });
  if (!item) notFound();

  const primary = item.photos.find((p) => p.isPrimary) ?? item.photos[0];
  const heroUrl = uploadUrl(primary?.path ?? null);

  const fields: { label: string; value: string }[] = [
    { label: "Inventarnummer", value: item.inventoryNumber ?? "" },
    { label: "Kategorie", value: item.category ?? "" },
    { label: "Epoche", value: item.era ?? "" },
    { label: "Herkunft", value: item.origin ?? "" },
    { label: "Material", value: item.material ?? "" },
    { label: "Maße", value: item.dimensions ?? "" },
    { label: "Zustand", value: item.condition ?? "" },
    { label: "Standort", value: item.location?.name ?? "" },
    { label: "Übernahmedatum", value: formatDate(item.acquisitionDate) },
  ].filter((f) => f.value);

  const appraisals = item.appraisals.map((a) => ({
    id: a.id,
    value: a.value,
    currency: a.currency,
    appraisalDate: a.appraisalDate ? a.appraisalDate.toISOString() : null,
    appraiser: a.appraiser,
    note: a.note,
  }));

  const photos = item.photos.map((p) => ({
    id: p.id,
    path: p.path,
    caption: p.caption,
    isPrimary: p.isPrimary,
  }));

  const sales = item.sales.map((s) => ({
    id: s.id,
    platform: s.platform,
    amount: s.amount,
    currency: s.currency,
    soldAt: s.soldAt ? s.soldAt.toISOString() : null,
    note: s.note,
  }));

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border/70 shadow-sm">
          {heroUrl ? (
            <Image src={heroUrl} alt={item.name} fill sizes="1024px" priority className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">
              <ImageOffIcon className="size-12" />
            </div>
          )}
        </div>

        <div className="mt-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{item.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.category ? <Badge variant="secondary">{item.category}</Badge> : null}
              {item.era ? <Badge variant="outline">{item.era}</Badge> : null}
              {item.condition ? <Badge variant="ghost">{item.condition}</Badge> : null}
              {sales.length > 0 ? <Badge variant="destructive">Verkauft</Badge> : null}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" aria-label="Objekt bearbeiten">
              <Link href={`/items/${item.id}/edit`}>
                <PencilIcon className="size-4" />
              </Link>
            </Button>
            <DeleteItemButton itemId={item.id} />
          </div>
        </div>

        {fields.length > 0 ? (
          <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.label} className="flex gap-2 text-sm">
                <dt className="w-40 shrink-0 text-muted-foreground">{f.label}</dt>
                <dd className="min-w-0">{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {item.description ? (
          <p className="mt-6 whitespace-pre-line leading-relaxed text-foreground/90">{item.description}</p>
        ) : null}

        <Separator className="my-8" />

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-primary">Fotos</h2>
          <PhotoManager itemId={item.id} photos={photos} />
        </section>

        <Separator className="my-8" />

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-primary">Wert & Gutachten</h2>
          <AppraisalsSection itemId={item.id} appraisals={appraisals} />
        </section>

        <Separator className="my-8" />

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-primary">Verkauf</h2>
          <SalesSection itemId={item.id} sales={sales} />
        </section>

        {item.location ? (
          <p className="mt-8 flex items-center gap-1.5 text-sm text-muted-foreground">
            <LandmarkIcon className="size-4" />
            Standort: {item.location.name}
          </p>
        ) : null}
      </main>
    </>
  );
}
