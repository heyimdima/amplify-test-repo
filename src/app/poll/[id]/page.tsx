"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { client } from "@/lib/amplify";
import type { Schema } from "../../../../amplify/data/resource";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Check } from "lucide-react";

export default function PollPage() {
  const params = useParams();
  const [poll, setPoll] = useState<Schema["Poll"]["type"] | null>(null);
  const [options, setOptions] = useState<Schema["Option"]["type"][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // Fetch poll data on mount
  useEffect(() => {
    async function fetchPoll() {
      const pollId = params.id as string;

      try {
        // Fetch the poll
        const { data: pollData, errors: pollErrors } =
          await client.models.Poll.get({ id: pollId });

        if (pollErrors || !pollData) {
          setError("Poll not found");
          setLoading(false);
          return;
        }

        setPoll(pollData);

        // Options will be loaded by the observeQuery subscription
        // Check localStorage to see if user has already voted
        const voted = localStorage.getItem(`voted_${pollId}`) === "true";
        const votedOption = localStorage.getItem(`voted_option_${pollId}`);
        setHasVoted(voted);
        setVotedOptionId(votedOption);

        setLoading(false);
      } catch (err) {
        console.error("Error fetching poll:", err);
        setError("Failed to load poll");
        setLoading(false);
      }
    }

    fetchPoll();
  }, [params.id]);

  // Real-time updates with observeQuery
  useEffect(() => {
    const pollId = params.id as string;
    if (!pollId) return;

    // console.log(`🔌 Setting up real-time subscription for poll ID: ${pollId}`);

    const subscription = client.models.Option.observeQuery({
      filter: {
        pollId: { eq: pollId },
      },
    }).subscribe({
      next: ({ items }) => {
        // console.log("📡 Received options update:", items.length, "options");
        // Sort by createdAt to maintain creation order
        const sorted = [...items].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setOptions(sorted);
      },
      error: (error) => {
        console.error("❌ Subscription error:", error);
      },
    });

    return () => {
      // console.log(`🔌 Unsubscribing from poll ID: ${pollId}`);
      subscription.unsubscribe();
    };
  }, [params.id]);

  // Set up timer to check poll expiration in real-time
  useEffect(() => {
    if (!poll?.expiresAt || isExpired) return;

    const checkExpiration = () => {
      const now = new Date();
      const expirationDate = new Date(poll.expiresAt!);

      if (now >= expirationDate) {
        setIsExpired(true);
        // console.log("⏰ Poll has expired");
      }
    };

    // Check immediately
    checkExpiration();

    // Then check every second (will auto-stop when isExpired changes)
    const interval = setInterval(checkExpiration, 1000);

    return () => clearInterval(interval);
  }, [poll?.expiresAt, isExpired]);

  const handleVote = async (optionId: string) => {
    if (voting || hasVoted || isExpired) return;

    setVoting(true);
    const pollId = params.id as string;
    // console.log(`🗳️  Voting for option ${optionId} on poll ${pollId}`);

    try {
      // Check if poll has expired
      if (poll?.expiresAt) {
        const now = new Date();
        const expirationDate = new Date(poll.expiresAt);

        if (now >= expirationDate) {
          setError("This poll has expired");
          setIsExpired(true);
          setVoting(false);
          return;
        }
      }

      // Get the current option to increment its voteCount
      const option = options.find((opt) => opt.id === optionId);
      if (!option) {
        setError("Invalid option");
        setVoting(false);
        return;
      }

      // Create a Vote record (with dummy voterIdentifier for now)
      const { errors: voteErrors } = await client.models.Vote.create({
        optionId: optionId,
        voterIdentifier: `anonymous_${Date.now()}`,
      });

      if (voteErrors) {
        // console.error("Error creating vote:", voteErrors);
        setError("Failed to record vote");
        setVoting(false);
        return;
      }

      // Increment the option's voteCount
      const { errors: updateErrors } = await client.models.Option.update({
        id: optionId,
        voteCount: (option.voteCount || 0) + 1,
      });

      if (updateErrors) {
        console.error("Error updating vote count:", updateErrors);
        setError("Failed to update vote count");
        setVoting(false);
        return;
      }

      // console.log("✅ Vote submitted successfully!");
      setHasVoted(true);
      setVotedOptionId(optionId);
      // Store in localStorage to prevent double voting
      localStorage.setItem(`voted_${pollId}`, "true");
      localStorage.setItem(`voted_option_${pollId}`, optionId);
      // The observeQuery subscription will update the UI automatically
    } catch (error) {
      console.error("❌ Failed to vote:", error);
      setError("Failed to vote");
    }

    setVoting(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-24 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-4 w-48" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2 p-3 rounded-lg border">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t space-y-2">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-40" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Poll Not Found</CardTitle>
              <CardDescription>
                {error || "This poll doesn't exist or has been deleted."}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const totalVotes = options.reduce(
    (sum, opt) => sum + (opt.voteCount || 0),
    0
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{poll.question}</CardTitle>
            <CardDescription>
              {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
              {isExpired && " • Poll closed"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Voting Status Message */}
            {!isExpired && !hasVoted && (
              <p className="text-sm text-muted-foreground">
                Click an option to cast your vote
              </p>
            )}
            {hasVoted && (
              <div className="text-sm text-muted-foreground bg-secondary/50 py-2 px-3 rounded">
                Thanks for voting! Results update in real-time.
              </div>
            )}
            {isExpired && (
              <p className="text-sm text-muted-foreground">
                This poll has closed
              </p>
            )}

            {/* Interactive Options with Progress Bars */}
            <div className="space-y-3">
              {options.map((option, index) => {
                const voteCount = option.voteCount || 0;
                const percentage =
                  totalVotes > 0
                    ? ((voteCount / totalVotes) * 100).toFixed(1)
                    : "0.0";

                const canVote = !isExpired && !hasVoted && !voting;
                const isVotedOption = votedOptionId === option.id;

                return (
                  <button
                    key={option.id}
                    onClick={() => canVote && handleVote(option.id)}
                    disabled={!canVote}
                    className={`w-full text-left space-y-2 p-3 rounded-lg border transition-all ${
                      canVote
                        ? "hover:bg-secondary/50 hover:border-primary cursor-pointer"
                        : "cursor-default"
                    }`}>
                    <div className="flex justify-between text-sm gap-2">
                      <span className="font-medium warp-break-words">
                        {option.text || ""}
                      </span>
                      <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2 shrink-0">
                        {isVotedOption && (
                          <span className="flex items-center gap-1 text-muted-foreground text-xs">
                            <Check className="h-3 w-3" />
                            Your vote
                          </span>
                        )}
                        <span className="text-muted-foreground whitespace-nowrap">
                          {voteCount} ({percentage}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: `var(--chart-${(index % 10) + 1})`,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Metadata */}
            <div className="text-sm text-muted-foreground pt-4 border-t space-y-1">
              <p>Created: {new Date(poll.createdAt).toLocaleString()}</p>
              {poll.expiresAt && (
                <p>
                  {isExpired ? "Closed" : "Closes"}:{" "}
                  {new Date(poll.expiresAt).toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
