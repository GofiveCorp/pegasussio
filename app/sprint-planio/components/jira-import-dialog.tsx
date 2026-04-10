"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useJira } from "../hooks/use-jira";
import { JiraIssue } from "../types";

interface JiraImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (issues: JiraIssue[]) => void;
}

export function JiraImportDialog({
  open,
  onOpenChange,
  onImport,
}: JiraImportDialogProps) {
  const [step, setStep] = useState<"connect" | "selection">("connect");
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { isConnected, siteName, connect, disconnect } = useJira();

  const { register, getValues } = useForm<{ jql: string }>({
    defaultValues: {
      jql: 'project = VENIO AND issuetype in (Story, "Production Issues", Beauty)',
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Search on debounced query change
  useEffect(() => {
    if (step === "selection") {
      const baseJql = getValues("jql") || "";
      const searchJql = debouncedQuery
        ? `${baseJql} AND (summary ~ "${debouncedQuery}*" OR key = "${debouncedQuery.toUpperCase()}")`
        : baseJql;
      fetchIssues(searchJql);
    }
  }, [debouncedQuery]);

  const fetchIssues = async (jql?: string) => {
    if (!isConnected) {
      toast.error("Please connect to Jira first");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("/api/jira/search", {
        jql: jql || getValues("jql"),
        maxResults: 20,
      });
      setIssues(res.data.issues);
      if (step === "connect") setStep("selection");
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || "Failed to fetch issues";
      if (error.response?.status === 401) {
        disconnect();
        toast.error("Session expired. Please reconnect.");
      } else {
        toast.error(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    const toImport = issues.filter((issue) =>
      selectedIssues.includes(issue.key),
    );
    onImport(toImport);
    onOpenChange(false);
    setStep("connect");
    setSelectedIssues([]);
    setSearchQuery("");
  };

  const toggleIssue = (key: string) => {
    setSelectedIssues((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl text-zinc-950 dark:text-zinc-50">
        <DialogHeader>
          <DialogTitle>Import from Jira</DialogTitle>
        </DialogHeader>

        {step === "connect" ? (
          <div className="py-8 flex flex-col items-center gap-6">
            <div className="text-center space-y-2">
              <h3 className="font-medium">Connect Pegasussio to Jira</h3>
              <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                Authorize access to act on your behalf. We will be able to read
                issues and post comments.
              </p>
            </div>

            {isConnected ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-full border border-green-200 dark:border-green-800">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">
                    Connected {siteName ? `to ${siteName}` : ""}
                  </span>
                </div>

                <div className="w-full max-w-sm">
                  <Label htmlFor="oauth-jql">JQL Filter (Optional)</Label>
                  <Input
                    id="oauth-jql"
                    placeholder='project = "XY" AND sprint in openSprints()'
                    className="mt-1.5"
                    {...register("jql")}
                  />
                </div>

                <Button
                  onClick={() => fetchIssues()}
                  disabled={loading}
                  className="w-full max-w-sm"
                >
                  {loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Fetch Issues
                </Button>
              </div>
            ) : (
              <Button
                size="lg"
                onClick={connect}
                className="bg-[#0052CC] hover:bg-[#0747A6] text-white"
              >
                Connect with Jira
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4 w-full min-w-0">
            <Input
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2 w-full min-w-0">
              {issues.length === 0 ? (
                <p className="text-center text-sm text-zinc-500 py-4">
                  {loading
                    ? "Searching..."
                    : "No issues found matching your query."}
                </p>
              ) : (
                issues.map((issue) => (
                  <div
                    key={issue.key}
                    className="flex items-start space-x-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded w-full overflow-hidden"
                  >
                    <Checkbox
                      id={issue.key}
                      checked={selectedIssues.includes(issue.key)}
                      onCheckedChange={() => toggleIssue(issue.key)}
                    />
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <label
                        htmlFor={issue.key}
                        className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer min-w-0"
                      >
                        <img
                          src={issue.typeIcon}
                          alt={issue.type}
                          className="h-4 w-4 flex-shrink-0"
                          title={issue.type}
                        />
                        <span className="font-bold text-blue-600 flex-shrink-0">
                          {issue.key}
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate flex-1 cursor-default text-left">
                                {issue.summary}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-[400px] break-words">
                                {issue.summary}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </label>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 ml-6">
                        <span>{issue.type}</span>
                        <span>•</span>
                        <span>{issue.status}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("connect")}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedIssues.length === 0}
              >
                Import Selected ({selectedIssues.length})
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
