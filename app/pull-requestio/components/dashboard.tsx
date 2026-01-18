"use client";

import { useState, useEffect, useCallback } from "react";
import { Octokit } from "octokit";
import { toast } from "sonner";
import { RepoInput } from "./repo-input";
import { PRList } from "./pr-list";
import { PRModal } from "./pr-modal";
import { SelectOption } from "./multi-select";
import { AlertCircle, Search } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { User, PullRequest } from "../types";
import { DashboardHeader } from "./dashboard-header";
import { DashboardFilters } from "./dashboard-filters";

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
          // Type casting since data might strictly not match our local interface exactly but it's compatible enough for our usage
          return data as unknown as PullRequest[];
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

      setPullRequests(allPRs);
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
      b === "develop" ||
      b === "master" ||
      b === "main" ||
      b.startsWith("release") ||
      b.includes("hotfix")
    );
  };

  const getPriority = (branch: string) => {
    const b = branch.toLowerCase();
    if (b === "uat") return 1;
    if (b === "develop") return 2;
    if (b === "master" || b === "main") return 3;
    if (
      b.startsWith("release") ||
      b.includes("hotfix") ||
      b.startsWith("hotfix")
    )
      return 4;
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <DashboardHeader
        token={token}
        setToken={setToken}
        repoCount={repos.length}
        onRefresh={fetchPullRequests}
        loading={loading}
        user={user}
      />

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

        <DashboardFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedBranches={selectedBranches}
          setSelectedBranches={setSelectedBranches}
          visibleBranches={visibleBranches}
          moreBranches={moreBranches}
          pinnedBranches={pinnedBranches}
          setPinnedBranches={setPinnedBranches}
          prOwners={prOwners}
          selectedOwners={selectedOwners}
          setSelectedOwners={setSelectedOwners}
        />

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
