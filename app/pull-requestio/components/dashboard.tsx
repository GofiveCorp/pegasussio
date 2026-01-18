"use client";

import { useState, useEffect, useCallback } from "react";
import { Octokit } from "octokit";
import { toast } from "sonner";
import { RepoInput } from "./repo-input";
import { PRList, PullRequest } from "./pr-list";
import { PRModal } from "./pr-modal";
import { MultiSelect, SelectOption } from "./multi-select";
import Link from "next/link";
import Image from "next/image";
import {
  Key,
  RefreshCw,
  AlertCircle,
  Search,
  Plus,
  Pin,
  X,
  ChevronDown,
  GitBranch,
  ArrowLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/mode-toggle";

interface User {
  login: string;
  avatar_url: string;
  html_url: string;
}

export function Dashboard() {
  const [token, setToken] = useState("");
  const [debouncedToken, setDebouncedToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [repos, setRepos] = useState<string[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [pinnedBranches, setPinnedBranches] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load state from localStorage on mount, merging with Env vars
  useEffect(() => {
    const envReposStr = process.env.NEXT_PUBLIC_WATCHED_REPOS;

    // Token priority: LocalStorage only
    const savedToken = localStorage.getItem("github_token");
    if (savedToken) {
      setToken(savedToken);
      setDebouncedToken(savedToken);
    }

    // Repos: Merge Env repos with LocalStorage repos
    const savedRepos = localStorage.getItem("watched_repos");
    let initialRepos: string[] = [];

    const savedPinnedBranches = localStorage.getItem("pinned_branches");
    if (savedPinnedBranches) {
      setPinnedBranches(JSON.parse(savedPinnedBranches));
    }

    if (envReposStr) {
      const envRepos = envReposStr
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
      initialRepos = [...initialRepos, ...envRepos];
    }

    if (savedRepos) {
      const parsed = JSON.parse(savedRepos);
      const unique = parsed.filter((r: string) => !initialRepos.includes(r));
      initialRepos = [...initialRepos, ...unique];
    }

    setRepos(initialRepos);
  }, []);

  useEffect(() => {
    localStorage.setItem("github_token", token);
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedToken(token);
    }, 500);
    return () => clearTimeout(timer);
  }, [token]);

  useEffect(() => {
    async function fetchUser() {
      if (!debouncedToken) {
        setUser(null);
        return;
      }
      try {
        const octokit = new Octokit({ auth: debouncedToken });
        const { data } = await octokit.rest.users.getAuthenticated();
        setUser({
          login: data.login,
          avatar_url: data.avatar_url,
          html_url: data.html_url,
        });
      } catch (e) {
        console.error("Failed to fetch user:", e);
        setUser(null);
      }
    }
    fetchUser();
  }, [debouncedToken]);

  useEffect(() => {
    localStorage.setItem("watched_repos", JSON.stringify(repos));
  }, [repos]);

  useEffect(() => {
    localStorage.setItem("pinned_branches", JSON.stringify(pinnedBranches));
  }, [pinnedBranches]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (showMoreDropdown) setShowMoreDropdown(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showMoreDropdown]);

  const fetchPullRequests = useCallback(async () => {
    if (repos.length === 0) {
      setPullRequests([]);
      return;
    }

    if (!debouncedToken) {
      setPullRequests([]);
      setError("Please enter a GitHub token to view pull requests.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const octokit = new Octokit({ auth: debouncedToken });
      const results = await Promise.allSettled(
        repos.map(async (repoStr) => {
          const [owner, repo] = repoStr.split("/");
          if (!owner || !repo) return [];
          const { data } = await octokit.rest.pulls.list({
            owner,
            repo,
            state: "open",
            sort: "created",
            direction: "desc",
          });
          return data;
        }),
      );

      const allPRs = results
        .flatMap((result) =>
          result.status === "fulfilled" ? result.value : [],
        )
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

      setPullRequests(allPRs as unknown as PullRequest[]);
    } catch (err: any) {
      console.error("Failed to fetch PRs:", err);
      if (err.status === 403) {
        setError("Rate limit exceeded. Please add a valid GitHub Token.");
      } else {
        setError(
          "Failed to fetch pull requests. Check your repository names and token.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [repos, debouncedToken]);

  useEffect(() => {
    if (repos.length > 0) {
      fetchPullRequests();
    }
  }, [fetchPullRequests]);

  const handleAddRepo = (repo: string) => {
    setRepos([...repos, repo]);
  };

  const handleRemoveRepo = (repo: string) => {
    setRepos(repos.filter((r) => r !== repo));
  };

  const isPriorityBranch = (branch: string) => {
    const b = branch.toLowerCase();
    return (
      b === "uat" ||
      b === "dev" ||
      b === "master" ||
      b === "main" ||
      b.startsWith("release") ||
      b.includes("hotfix")
    );
  };

  const getPriority = (branch: string) => {
    const b = branch.toLowerCase();
    if (b === "uat") return 1;
    if (b === "dev") return 2;
    if (b === "master" || b === "main") return 3;
    if (b.startsWith("release") || b.includes("hotfix")) return 4;
    // Pinned branches (non-priority)
    if (pinnedBranches.includes(branch) && !isPriorityBranch(branch)) return 5;
    return 6;
  };

  const targetBranches = Array.from(
    new Set(pullRequests.map((pr) => pr.base.ref)),
  ).sort((a, b) => {
    const pA = getPriority(a);
    const pB = getPriority(b);
    if (pA !== pB) return pA - pB;
    return a.localeCompare(b);
  });

  const visibleBranches = targetBranches.slice(0, 5);
  const moreBranches = targetBranches.slice(5);

  const prOwnersMap = new Map<string, { login: string; avatar: string }>();
  pullRequests.forEach((pr) => {
    if (!prOwnersMap.has(pr.user.login)) {
      prOwnersMap.set(pr.user.login, {
        login: pr.user.login,
        avatar: pr.user.avatar_url,
      });
    }
  });

  const prOwners: SelectOption[] = Array.from(prOwnersMap.values())
    .sort((a, b) => a.login.localeCompare(b.login))
    .map((owner) => ({
      value: owner.login,
      label: owner.login,
      avatar: owner.avatar,
    }));

  const filteredPRs = pullRequests.filter((pr) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      pr.title.toLowerCase().includes(searchLower) ||
      pr.user.login.toLowerCase().includes(searchLower) ||
      pr.base.repo.full_name.toLowerCase().includes(searchLower);

    const matchesBranch =
      selectedBranches.length === 0 || selectedBranches.includes(pr.base.ref);
    const matchesOwner =
      selectedOwners.length === 0 || selectedOwners.includes(pr.user.login);

    return matchesSearch && matchesBranch && matchesOwner;
  });

  const groupedPRs = filteredPRs.reduce(
    (acc, pr) => {
      const repo = pr.base.repo.full_name;
      if (!acc[repo]) acc[repo] = [];
      acc[repo].push(pr);
      return acc;
    },
    {} as Record<string, PullRequest[]>,
  );

  const handleQuickApprove = async (pr: PullRequest) => {
    try {
      if (!token) {
        toast.error("Please enter a GitHub token first.");
        return;
      }

      const octokit = new Octokit({ auth: token });
      const [owner, repo] = pr.base.repo.full_name.split("/");

      await octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number: pr.id ? pr.number : 0,
        body: "LGTM",
        event: "APPROVE",
      });

      toast.success("PR approved successfully!");
      fetchPullRequests();
    } catch (error) {
      console.error("Failed to approve PR:", error);
      toast.error("Failed to approve PR. Check permissions.");
    }
  };

  const handleToggleBranch = (branch: string) => {
    if (selectedBranches.includes(branch)) {
      setSelectedBranches(selectedBranches.filter((b) => b !== branch));
    } else {
      setSelectedBranches([...selectedBranches, branch]);
    }
  };

  const handleTogglePin = (branch: string) => {
    if (isPriorityBranch(branch)) {
      if (!pinnedBranches.includes(branch)) {
        setPinnedBranches([...pinnedBranches, branch]);
      }
      return;
    }
    if (pinnedBranches.includes(branch)) {
      setPinnedBranches(pinnedBranches.filter((b) => b !== branch));
    } else {
      setPinnedBranches([...pinnedBranches, branch]);
    }
  };

  const getBranchColor = (branch: string) => {
    const b = branch.toLowerCase();
    if (b === "dev")
      return "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700";
    if (b === "uat")
      return "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700";
    if (b === "master" || b === "main")
      return "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700";
    if (b.startsWith("release"))
      return "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700";
    if (b.includes("hotfix"))
      return "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700";
    return "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden">
              <Image
                src="/images/pull-requestio-logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  PullRequestio
                </h1>
                <ModeToggle />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Dashboard for {repos.length} repositories
              </p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
            <Button size="sm" asChild className="rounded-full">
              <Link href="/pull-requestio/create">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden xs:inline sm:inline">Create PR</span>
                <span className="inline xs:hidden sm:hidden">New</span>
              </Link>
            </Button>

            {user && (
              <a
                href={user.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>{user.login.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-xs">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {user.login}
                  </p>
                </div>
              </a>
            )}

            <div className="group relative flex items-center flex-1 sm:flex-none">
              <Key className="absolute left-3 h-4 w-4 text-zinc-400" />
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="GitHub Token"
                className="w-full sm:w-48 rounded-full pl-9 h-9"
              />
            </div>

            <Button
              size="icon"
              variant="secondary"
              onClick={fetchPullRequests}
              disabled={loading}
              className="rounded-full"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl p-6">
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Watched Repositories
            </h2>
            <RepoInput
              repos={repos}
              onAddRepo={handleAddRepo}
              onRemoveRepo={handleRemoveRepo}
            />
          </CardContent>
        </Card>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="mb-6">
          <div className="relative flex-1 w-full mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, author, or repo..."
              className="pl-10 h-11 rounded-xl"
            />
          </div>

          {/* Branch Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 mr-2">
              <GitBranch className="h-4 w-4" /> Branch:
            </div>

            <Button
              variant={selectedBranches.length === 0 ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedBranches([])}
              className="h-7 text-xs"
            >
              All
            </Button>

            {visibleBranches.map((branch) => {
              const isActive = selectedBranches.includes(branch);
              const colorClass = isActive ? getBranchColor(branch) : "";

              return (
                <button
                  key={branch}
                  onClick={() => handleToggleBranch(branch)}
                  className={`group relative rounded-lg px-3 py-1.5 text-xs font-medium transition-all border flex items-center gap-1.5 ${
                    isActive
                      ? getBranchColor(branch) + " shadow-sm"
                      : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-800"
                  }`}
                >
                  {branch}
                  {pinnedBranches.includes(branch) && (
                    <Pin className="h-3 w-3 fill-current opacity-50" />
                  )}
                  {!isPriorityBranch(branch) && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(branch);
                      }}
                      className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full bg-zinc-700 text-white hover:bg-zinc-800 dark:bg-zinc-600 dark:hover:bg-zinc-500"
                    >
                      <X className="h-2.5 w-2.5" />
                    </div>
                  )}
                </button>
              );
            })}

            {moreBranches.length > 0 && (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoreDropdown(!showMoreDropdown);
                  }}
                >
                  More{" "}
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${showMoreDropdown ? "rotate-180" : ""}`}
                  />
                </Button>

                {showMoreDropdown && (
                  <div className="absolute top-full mt-2 left-0 z-20 min-w-[200px] rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950 max-h-60 overflow-y-auto">
                    {moreBranches.map((branch) => (
                      <div
                        key={branch}
                        className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 ${selectedBranches.includes(branch) ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleBranch(branch);
                          }}
                          className={`flex-1 text-left flex items-center gap-2 ${selectedBranches.includes(branch) ? "text-blue-600 dark:text-blue-400 font-medium" : "text-zinc-700 dark:text-zinc-300"}`}
                        >
                          {branch}
                          {pinnedBranches.includes(branch) && (
                            <Pin className="h-3 w-3 fill-current opacity-50" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePin(branch);
                          }}
                          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                        >
                          <Pin
                            className={`h-3 w-3 ${pinnedBranches.includes(branch) ? "fill-current text-blue-500" : "text-zinc-400"}`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 max-w-xs">
            <MultiSelect
              options={prOwners}
              selectedValues={selectedOwners}
              onChange={setSelectedOwners}
              placeholder="Filter by owner..."
              label="Owner"
            />
          </div>
        </div>

        {loading ? (
          <PRList
            pullRequests={[]}
            loading={true}
            onSelectPR={() => {}}
            onQuickApprove={() => {}}
          />
        ) : Object.keys(groupedPRs).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedPRs).map(([repoName, prs]) => (
              <div key={repoName}>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {repoName}
                  </h2>
                  <Badge variant="secondary" className="rounded-full">
                    {prs.length}
                  </Badge>
                </div>
                <PRList
                  pullRequests={prs}
                  loading={false}
                  onSelectPR={setSelectedPR}
                  onQuickApprove={handleQuickApprove}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center text-center text-zinc-500 dark:text-zinc-400 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <Search className="mb-4 h-12 w-12 opacity-20" />
            <p className="text-lg font-medium">No matches found</p>
          </div>
        )}
      </main>

      {selectedPR && (
        <PRModal
          pr={selectedPR}
          token={token}
          onClose={() => setSelectedPR(null)}
          onApprove={() => fetchPullRequests()}
        />
      )}
    </div>
  );
}
