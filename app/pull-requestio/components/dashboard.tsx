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
  Github,
  Key,
  RefreshCw,
  AlertCircle,
  Search,
  Plus,
  Filter,
  Pin,
  X,
  ChevronDown,
  GitBranch,
  User,
  ArrowLeft,
} from "lucide-react";

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
      setDebouncedToken(savedToken); // Initialize debounced token immediately on load
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
      // Avoid duplicates
      const unique = parsed.filter((r: string) => !initialRepos.includes(r));
      initialRepos = [...initialRepos, ...unique];
    }

    setRepos(initialRepos);
  }, []);

  // Save state when Changed (only save what's NOT in env? Or just save all?
  // Simple: save all, but on load we re-merge, so duplicates are handled)
  useEffect(() => {
    localStorage.setItem("github_token", token);
  }, [token]);

  // Debounce token updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedToken(token);
    }, 500);

    return () => clearTimeout(timer);
  }, [token]);

  // Fetch User Profile
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

  // Close dropdown when clicking outside
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

    // Do not fetch if token is empty
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
        })
      );

      const allPRs = results
        .flatMap((result) =>
          result.status === "fulfilled" ? result.value : []
        )
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      setPullRequests(allPRs as unknown as PullRequest[]);
    } catch (err: any) {
      console.error("Failed to fetch PRs:", err);
      // Handle rate limit error specifically if possible, giving a hint
      if (err.status === 403) {
        setError("Rate limit exceeded. Please add a valid GitHub Token.");
      } else {
        setError(
          "Failed to fetch pull requests. Check your repository names and token."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [repos, debouncedToken]);

  // Auto-fetch when repos change (debounce could be good but keep it simple for now)
  useEffect(() => {
    if (repos.length > 0) {
      fetchPullRequests();
    }
  }, [fetchPullRequests]); // Careful with deps, fetchPullRequests refs repos/token

  const handleAddRepo = (repo: string) => {
    setRepos([...repos, repo]);
  };

  const handleRemoveRepo = (repo: string) => {
    setRepos(repos.filter((r) => r !== repo));
  };

  // Helper to check if a branch is a priority branch
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

  // Extract unique target branches and sort them based on priority
  const getPriority = (branch: string) => {
    const b = branch.toLowerCase();
    if (b === "uat") return 1;
    if (b === "dev") return 2;
    if (b === "master" || b === "main") return 3;
    if (b.startsWith("release")) return 4;
    if (b.includes("hotfix")) return 4.5; // hotfix มี priority เดียวกับ release แต่ต่ำกว่าเล็กน้อย
    // Pinned branches (non-priority)
    if (pinnedBranches.includes(branch) && !isPriorityBranch(branch)) return 5;
    return 6;
  };

  const targetBranches = Array.from(
    new Set(pullRequests.map((pr) => pr.base.ref))
  ).sort((a, b) => {
    const pA = getPriority(a);
    const pB = getPriority(b);
    if (pA !== pB) return pA - pB;
    return a.localeCompare(b);
  });

  // Top 5 branches to show inline
  const visibleBranches = targetBranches.slice(0, 5);
  const moreBranches = targetBranches.slice(5);

  // Extract unique owners from PRs with avatar
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

  const groupedPRs = filteredPRs.reduce((acc, pr) => {
    const repo = pr.base.repo.full_name;
    if (!acc[repo]) acc[repo] = [];
    acc[repo].push(pr);
    return acc;
  }, {} as Record<string, PullRequest[]>);

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
        pull_number: pr.id ? pr.number : 0, // Fallback if number missing in type, but it should be there. Wait, PullRequest type might miss 'number'?
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
    // Cannot unpin priority branches
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
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden">
              <Image
                src="/images/pull-requestio-logo.png"
                alt="Pull Requestio Logo"
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
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Dashboard for {repos.length} repositories
              </p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
            <Link
              href="/pull-requestio/create"
              className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-4 py-2 rounded-full text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">Create PR</span>
              <span className="inline xs:hidden sm:hidden">New</span>
            </Link>

            {user && (
              <a
                href={user.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="h-8 w-8 rounded-full border border-zinc-200 dark:border-zinc-800"
                />
                <div className="hidden md:block text-xs">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {user.login}
                  </p>
                </div>
              </a>
            )}

            <div className="group relative flex items-center flex-1 sm:flex-none">
              <Key className="absolute left-3 h-4 w-4 text-zinc-400" />
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="GitHub Token"
                className="w-full sm:w-48 rounded-full border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-xs outline-none transition-all focus:w-full sm:focus:w-64 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <button
              onClick={fetchPullRequests}
              disabled={loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl p-6">
        <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Watched Repositories
          </h2>
          <RepoInput
            repos={repos}
            onAddRepo={handleAddRepo}
            onRemoveRepo={handleRemoveRepo}
          />
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="mb-6">
          <div className="relative flex-1 w-full mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, author, or repo..."
              className="w-full rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          {/* Branch Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 mr-2">
              <GitBranch className="h-4 w-4" />
              Branch:
            </div>

            {/* All Branches Button */}
            <button
              onClick={() => setSelectedBranches([])}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all border ${
                selectedBranches.length === 0
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-800"
              }`}
            >
              All
            </button>

            {/* Visible branches (top 5) */}
            {visibleBranches.map((branch) => (
              <button
                key={branch}
                onClick={() => handleToggleBranch(branch)}
                className={`group relative rounded-lg px-3 py-1.5 text-xs font-medium transition-all border ${
                  selectedBranches.includes(branch)
                    ? getBranchColor(branch) + " shadow-sm"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-800"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {branch}
                  {pinnedBranches.includes(branch) && (
                    <Pin className="h-3 w-3 fill-current opacity-50" />
                  )}
                </span>
                {!isPriorityBranch(branch) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePin(branch);
                    }}
                    className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full bg-zinc-700 text-white hover:bg-zinc-800 dark:bg-zinc-600 dark:hover:bg-zinc-500"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </button>
            ))}

            {/* More branches dropdown */}
            {moreBranches.length > 0 && (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoreDropdown(!showMoreDropdown);
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all border bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-800"
                >
                  More
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${
                      showMoreDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showMoreDropdown && (
                  <div className="absolute top-full mt-2 left-0 z-20 min-w-[200px] rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950 max-h-60 overflow-y-auto">
                    {moreBranches.map((branch) => (
                      <div
                        key={branch}
                        className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 ${
                          selectedBranches.includes(branch)
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : ""
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleBranch(branch);
                          }}
                          className={`flex-1 text-left flex items-center gap-2 ${
                            selectedBranches.includes(branch)
                              ? "text-blue-600 dark:text-blue-400 font-medium"
                              : "text-zinc-700 dark:text-zinc-300"
                          }`}
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
                          title={
                            pinnedBranches.includes(branch)
                              ? "Unpin branch"
                              : "Pin branch"
                          }
                        >
                          <Pin
                            className={`h-3 w-3 ${
                              pinnedBranches.includes(branch)
                                ? "fill-current text-blue-500"
                                : "text-zinc-400"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Owner Filter */}
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
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full text-xs font-medium">
                    {prs.length}
                  </span>
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
            {searchQuery ? (
              <>
                <Search className="mb-4 h-12 w-12 opacity-20" />
                <p className="text-lg font-medium">No matches found</p>
                <p className="text-sm">Try adjusting your search query</p>
              </>
            ) : (
              <PRList
                pullRequests={[]}
                loading={false}
                onSelectPR={() => {}}
                onQuickApprove={() => {}}
              />
            )}
          </div>
        )}
      </main>

      {selectedPR && (
        <PRModal
          pr={selectedPR}
          token={token}
          onClose={() => setSelectedPR(null)}
          onApprove={() => {
            fetchPullRequests();
          }}
        />
      )}
    </div>
  );
}
