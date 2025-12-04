"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { client } from "@/lib/amplify";
import type { Schema } from "../../../../amplify/data/resource";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

export default function PollPage() {
  const params = useParams();
  const [poll, setPoll] = useState<Schema["Poll"]["type"] | null>(null);
  const [options, setOptions] = useState<Schema["Option"]["type"][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
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
        setHasVoted(voted);

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

    console.log(`🔌 Setting up real-time subscription for poll ID: ${pollId}`);

    const subscription = client.models.Option.observeQuery({
      filter: {
        pollId: { eq: pollId },
      },
    }).subscribe({
      next: ({ items }) => {
        console.log("📡 Received options update:", items.length, "options");
        setOptions([...items]);
      },
      error: (error) => {
        console.error("❌ Subscription error:", error);
      },
    });

    return () => {
      console.log(`🔌 Unsubscribing from poll ID: ${pollId}`);
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
        console.log("⏰ Poll has expired");
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
    console.log(`🗳️  Voting for option ${optionId} on poll ${pollId}`);

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
        console.error("Error creating vote:", voteErrors);
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

      console.log("✅ Vote submitted successfully!");
      setHasVoted(true);
      // Store in localStorage to prevent double voting
      localStorage.setItem(`voted_${pollId}`, "true");
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
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-muted-foreground">Loading poll...</p>
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

  // Prepare chart data
  const chartData = options.map((option, index) => ({
    name: option.text || "",
    votes: option.voteCount || 0,
    fill: `hsl(var(--chart-${(index % 5) + 1}))`,
  }));

  const chartConfig = {
    votes: {
      label: "Votes",
    },
  } satisfies ChartConfig;

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
            {/* Chart Visualization */}
            <ChartContainer
              config={chartConfig}
              className="min-h-[300px] w-full">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="votes" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>

            {/* Voting Buttons (only show if not expired and not voted) */}
            {!isExpired && !hasVoted && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Cast your vote:</p>
                <div className="grid gap-2">
                  {options.map((option) => (
                    <Button
                      key={option.id}
                      variant="outline"
                      className="justify-start h-auto py-3"
                      onClick={() => handleVote(option.id)}
                      disabled={voting}>
                      {option.text || ""}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {hasVoted && (
              <div className="text-center text-sm text-muted-foreground bg-secondary/50 py-2 rounded">
                Thanks for voting! Results update in real-time.
              </div>
            )}

            {/* Options List with Progress Bars */}
            <div className="space-y-3">
              {options.map((option, index) => {
                const voteCount = option.voteCount || 0;
                const percentage =
                  totalVotes > 0
                    ? ((voteCount / totalVotes) * 100).toFixed(1)
                    : "0.0";

                return (
                  <div key={option.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{option.text || ""}</span>
                      <span className="text-muted-foreground">
                        {voteCount} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))`,
                        }}
                      />
                    </div>
                  </div>
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
