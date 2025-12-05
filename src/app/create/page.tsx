"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { client } from "@/lib/amplify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";

export default function Create() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date>();
  const [expirationTime, setExpirationTime] = useState("23:59");
  const [timeZone, setTimeZone] = useState<string | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Filter valid options
      const validOptions = options.filter((opt) => opt.trim());

      // Prepare poll input
      let pollInput: { question: string; expiresAt?: string } = {
        question: question,
      };

      // Add expiration if enabled
      if (hasExpiration && expirationDate) {
        const [hours, minutes] = expirationTime.split(":");
        const expiresAt = new Date(expirationDate);
        expiresAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        pollInput.expiresAt = expiresAt.toISOString();
      }

      // Step 1: Create the Poll
      const { data: poll, errors: pollErrors } =
        await client.models.Poll.create(pollInput);

      if (pollErrors || !poll) {
        console.error("Error creating poll:", pollErrors);
        setIsSubmitting(false);
        return;
      }

      console.log("Poll created successfully:", poll.id);

      // Step 2: Create all Options
      for (const optionText of validOptions) {
        const { errors: optionErrors } = await client.models.Option.create({
          pollId: poll.id,
          text: optionText,
          voteCount: 0,
        });

        if (optionErrors) {
          console.error("Error creating option:", optionErrors);
        }
      }

      console.log("Options created successfully!");
      console.log("Redirecting to the poll link");

      router.push(`/poll/${poll.id}`);
    } catch (error) {
      console.error("Error creating poll:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 flex-1 flex items-center">
      <div className="max-w-2xl mx-auto w-full">
        <Card>
          <CardHeader>
            <CardTitle>Create a New Poll</CardTitle>
            <CardDescription>
              Ask a question and provide options for people to vote on.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="question">Poll Question</Label>
                <Input
                  id="question"
                  placeholder="What's your question?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-4">
                <Label>Answer Options</Label>
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      required
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addOption}
                  disabled={options.length >= 10}
                  className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {options.length >= 10 ? "Maximum 10 options" : "Add Option"}
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="expiration">Poll Expiration</Label>
                    <p className="text-sm text-muted-foreground">
                      Set when this poll should close
                    </p>
                  </div>
                  <Switch
                    id="expiration"
                    checked={hasExpiration}
                    onCheckedChange={setHasExpiration}
                  />
                </div>

                {hasExpiration && (
                  <div className="flex gap-4">
                    <div className="flex flex-col gap-3 flex-1">
                      <Label htmlFor="date-picker" className="px-1">
                        Date
                      </Label>
                      <Popover
                        open={calendarOpen}
                        onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            id="date-picker"
                            className="justify-start font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {expirationDate ? (
                              format(expirationDate, "PPP")
                            ) : (
                              <span>Select date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={expirationDate}
                            onSelect={(date) => {
                              setExpirationDate(date);
                              setCalendarOpen(false);
                            }}
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              return date < today;
                            }}
                            captionLayout="dropdown"
                            startMonth={new Date(2025, 0)}
                            endMonth={new Date(2030, 11)}
                            timeZone={timeZone}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex flex-col gap-3">
                      <Label htmlFor="time-picker" className="px-1">
                        Time
                      </Label>
                      <Input
                        type="time"
                        id="time-picker"
                        value={expirationTime}
                        onChange={(e) => setExpirationTime(e.target.value)}
                        className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Poll"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
