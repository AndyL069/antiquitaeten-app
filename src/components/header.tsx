import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { LandmarkIcon, MapPinIcon, PlusIcon } from "lucide-react";

export async function Header() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-heading text-lg font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <LandmarkIcon className="size-4" />
            </span>
            Antiquitäten
          </Link>
          {session ? (
            <nav className="hidden items-center gap-1 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/locations">
                  <MapPinIcon className="size-4" />
                  Standorte
                </Link>
              </Button>
            </nav>
          ) : null}
        </div>
        {session ? (
          <div className="flex items-center gap-3">
            <Button asChild size="sm">
              <Link href="/new">
                <PlusIcon className="size-4" />
                Neues Objekt
              </Link>
            </Button>
            <UserMenu email={session.user.email} role={session.user.role} />
          </div>
        ) : null}
      </div>
    </header>
  );
}
