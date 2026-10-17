import { ShortlistBrowser } from "@/features/shortlists";

export default async function ShortlistPage({ params }: { params: Promise<{ shortlistId: string }> }) {
  const { shortlistId } = await params;
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 pt-28 pb-20">
      <header className="mb-9">
        <p className="text-sm tracking-widest text-accent uppercase">Your travel ideas</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text">Your shortlist.</h1>
      </header>
      <ShortlistBrowser shortlistId={shortlistId} />
    </main>
  );
}
