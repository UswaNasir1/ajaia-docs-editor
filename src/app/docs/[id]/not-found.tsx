import Link from "next/link";

export default function DocumentNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Document not found
      </h1>
      <p className="text-sm text-muted-foreground">
        Document not found or you don&apos;t have access.
      </p>
      <Link
        href="/"
        className="inline-flex h-8 items-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
