import type { Metadata } from "next";
import { client } from "@/lib/amplify";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    // Await params first (Next.js 15 requirement)
    const { id } = await params;

    // Fetch the poll data for SEO
    const { data: poll } = await client.models.Poll.get({ id });

    if (!poll) {
      return {
        title: "Poll Not Found - Quick Poll",
        description:
          "This poll could not be found. Create your own free poll with Quick Poll - instant setup, real-time results, no signup required.",
      };
    }

    // Get options count
    const { data: options } = await client.models.Option.list({
      filter: { pollId: { eq: id } },
    });

    const optionsCount = options?.length || 0;
    const totalVotes = options?.reduce(
      (sum, opt) => sum + (opt.voteCount || 0),
      0
    );

    // Create a descriptive title and meta description
    const title = `${poll.question} - Vote Now on Quick Poll`;
    const description = `Cast your vote on "${poll.question}" - ${optionsCount} options available. ${totalVotes || 0} votes so far. See real-time results as votes come in. Free poll by Quick Poll.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch (error) {
    // Fallback metadata if fetch fails
    return {
      title: "Vote on Poll - Quick Poll",
      description:
        "Cast your vote and see real-time results. Quick Poll makes it easy to create and share polls with instant voting and live updates.",
    };
  }
}

export default function PollLayout({ children }: Props) {
  return <>{children}</>;
}
