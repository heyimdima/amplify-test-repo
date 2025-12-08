import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <section className="container mx-auto px-4 py-16 sm:py-24 lg:py-32">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Quick polls, <span className="text-primary">no hassle</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Make a poll, share the link, see results in real-time.
            </p>
          </div>

          <Button asChild size="lg">
            <Link href="/create">Create a new Poll</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
