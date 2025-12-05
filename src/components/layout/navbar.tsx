import Link from "next/link";
import { Github, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/">
            <span className="text-xl font-bold hover:opacity-80 transition-opacity">
              quickpoll.live
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Button asChild>
              <Link href="/create">Create Poll</Link>
            </Button>
            <Link
              href="https://github.com/heyimdima/quick-poll"
              className="opacity-75 hover:opacity-100 transition-opacity">
              <Github />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
