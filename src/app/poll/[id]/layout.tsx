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
        title: "Poll Not Found | Quick Poll",
        description:
          "This poll could not be found. Create your own free poll with real-time results and no signup required.",
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
    // Truncate question if too long (keep under 60 chars for SEO)
    const truncatedQuestion = poll.question.length > 50
      ? poll.question.substring(0, 50) + "..."
      : poll.question;

    const title = `${truncatedQuestion} | Quick Poll`;
    const description = `Vote on "${truncatedQuestion}" with ${optionsCount} options. ${totalVotes || 0} votes cast. Real-time results, no signup required.`;

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
      title: "Vote on Poll | Quick Poll",
      description:
        "Cast your vote and see real-time results. Create and share polls with instant voting and live updates.",
    };
  }
}

export default function PollLayout({ children }: Props) {
  return <>{children}</>;
}
