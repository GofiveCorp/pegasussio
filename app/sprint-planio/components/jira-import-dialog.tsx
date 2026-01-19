"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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

const jiraSchema = z.object({
  domain: z.string().min(1, "Domain is required"),
  email: z.string().email("Invalid email"),
  token: z.string().min(1, "API Token is required"),
  jql: z.string().optional(),
});

type JiraFormData = z.infer<typeof jiraSchema>;

interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  type: string;
  typeIcon: string;
}

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
  const [step, setStep] = useState<"credentials" | "selection">("credentials");
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Auth State
  const [authMethod, setAuthMethod] = useState<"basic" | "oauth">("basic");
  const [oauthConnected, setOauthConnected] = useState(false);
  const [oauthSiteName, setOauthSiteName] = useState("");

  // Load defaults from localStorage
  const defaultValues = {
    domain:
      typeof window !== "undefined"
        ? localStorage.getItem("jira_domain") || ""
        : "",
    email:
      typeof window !== "undefined"
        ? localStorage.getItem("jira_email") || ""
        : "",
    token:
      typeof window !== "undefined"
        ? localStorage.getItem("jira_token") || ""
        : "",
    jql: 'project = VENIO AND issuetype in (Story, "Production Issues", Beauty)',
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const type = localStorage.getItem("jira_auth_type");
      if (type === "oauth") {
        setAuthMethod("oauth");
        const token = localStorage.getItem("jira_access_token");
        if (token) {
          setOauthConnected(true);
          setOauthSiteName("Jira Cloud"); // We don't save site name yet, could add it
        }
      } else {
        setAuthMethod("basic");
      }
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<JiraFormData>({
    resolver: zodResolver(jiraSchema),
    defaultValues,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Search effect
  useEffect(() => {
    if (step === "selection") {
      const baseJql = getValues("jql") || "";
      const searchJql = debouncedQuery
        ? `${baseJql} AND (summary ~ "${debouncedQuery}*" OR key = "${debouncedQuery.toUpperCase()}")`
        : baseJql;

      // Construct credentials based on active auth method
      const credentials: any = {};
      if (authMethod === "basic") {
        credentials.domain = getValues("domain");
        credentials.email = getValues("email");
        credentials.token = getValues("token");
        credentials.authType = "basic";
      } else {
        credentials.accessToken = localStorage.getItem("jira_access_token");
        credentials.cloudId = localStorage.getItem("jira_cloud_id");
        credentials.authType = "oauth";
      }

      fetchIssues({ ...credentials, jql: searchJql });
    }
  }, [debouncedQuery]);

  const handleOAuthLogin = () => {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      "/api/jira/oauth/login",
      "Jira OAuth",
      `width=${width},height=${height},left=${left},top=${top}`,
    );

    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const { type, accessToken, cloudId, siteName } = event.data;
      if (type === "JIRA_OAUTH_SUCCESS") {
        localStorage.setItem("jira_access_token", accessToken);
        localStorage.setItem("jira_cloud_id", cloudId);
        localStorage.setItem("jira_auth_type", "oauth");

        setOauthConnected(true);
        setOauthSiteName(siteName);
        toast.success(`Connected to ${siteName}`);

        if (popup) popup.close();
        window.removeEventListener("message", messageHandler);
      }
    };

    window.addEventListener("message", messageHandler);
  };

  const fetchIssues = async (data: any) => {
    setLoading(true);
    try {
      if (authMethod === "basic") {
        // Validation for Basic Auth
        if (!data.domain || !data.email || !data.token) {
          // Should ideally be handled by form submit but for debounce call:
          if (step === "selection") return;
        }
        localStorage.setItem("jira_domain", data.domain);
        localStorage.setItem("jira_email", data.email);
        localStorage.setItem("jira_token", data.token);
        localStorage.setItem("jira_auth_type", "basic");
      } else {
        if (!oauthConnected) {
          toast.error("Please connect to Jira first");
          return;
        }
        // Inject tokens if not present (from form handler vs effect)
        if (!data.accessToken) {
          data.accessToken = localStorage.getItem("jira_access_token");
          data.cloudId = localStorage.getItem("jira_cloud_id");
          data.authType = "oauth";
        }
      }

      const res = await axios.post("/api/jira/search", {
        ...data,
        authType: authMethod,
        maxResults: 20,
      });
      setIssues(res.data.issues);
      if (step === "credentials") setStep("selection");
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || "Failed to fetch issues";
      if (errMsg.includes("Unauthorized") && authMethod === "oauth") {
        setOauthConnected(false); // Token might have expired
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
    setStep("credentials");
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

        {step === "credentials" ? (
          <div className="space-y-4">
            {/* Custom Tabs */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
              <button
                onClick={() => setAuthMethod("basic")}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${authMethod === "basic" ? "bg-white dark:bg-zinc-950 shadow text-zinc-900 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
              >
                Basic Auth
              </button>
              <button
                onClick={() => setAuthMethod("oauth")}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${authMethod === "oauth" ? "bg-white dark:bg-zinc-950 shadow text-zinc-900 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
              >
                OAuth 2.0 (Recommended)
              </button>
            </div>

            {authMethod === "basic" ? (
              <form
                onSubmit={handleSubmit((data) =>
                  fetchIssues({ ...data, authType: "basic" }),
                )}
                className="space-y-4"
              >
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="domain" className="text-right">
                      Domain
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="domain"
                        placeholder="your-company.atlassian.net"
                        {...register("domain")}
                      />
                      {errors.domain && (
                        <p className="text-sm text-red-500">
                          {errors.domain.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        {...register("email")}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="token" className="text-right">
                      API Token
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="token"
                        type="password"
                        placeholder="Jira API Token"
                        {...register("token")}
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">
                        Generate at id.atlassian.com/manage/api-tokens
                      </p>
                      {errors.token && (
                        <p className="text-sm text-red-500">
                          {errors.token.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="jql" className="text-right">
                      JQL Query
                    </Label>
                    <div className="col-span-3">
                      <Input id="jql" {...register("jql")} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Fetch Issues
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              // OAuth View
              <div className="py-8 flex flex-col items-center gap-6">
                <div className="text-center space-y-2">
                  <h3 className="font-medium">Connect Pegasussio to Jira</h3>
                  <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                    Authorize access to act on your behalf. We will be able to
                    read issues and post comments.
                  </p>
                </div>

                {oauthConnected ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-full border border-green-200 dark:border-green-800">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium">
                        Connected {oauthSiteName ? `to ${oauthSiteName}` : ""}
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
                      onClick={() =>
                        fetchIssues({
                          authType: "oauth",
                          jql: getValues("jql"),
                        })
                      }
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
                    onClick={handleOAuthLogin}
                    className="bg-[#0052CC] hover:bg-[#0747A6] text-white"
                  >
                    Connect with Jira
                  </Button>
                )}
              </div>
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
              <Button variant="outline" onClick={() => setStep("credentials")}>
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
