import { Header } from "@/components/header";
import { ItemGrid } from "@/components/item-grid";

export default function Home() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <ItemGrid />
      </main>
    </>
  );
}
