import { SavedDestinations } from "@/widgets/saved-destinations";
import Link from "next/link";

export default function SavedPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 pt-28 pb-20">
      <header className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm tracking-widest text-accent uppercase">Your travel ideas</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text sm:text-5xl">Your shortlists.</h1>
          <p className="mt-3 max-w-2xl text-text/70">Organise the places that caught your eye into private shortlists for your next trip.</p>
        </div>
        <Link href="/planner" className="text-sm font-medium whitespace-nowrap text-primary">
          Find more destinations
        </Link>
      </header>

      <SavedDestinations />
    </main>
  );
}
