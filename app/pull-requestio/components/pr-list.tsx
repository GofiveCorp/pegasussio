"use client";

import {
  GitPullRequest,
  GitMerge,
  Clock,
  ExternalLink,
  Check,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Helper to check if PR is recent (within 30 mins)
const isRecentPR = (createdAt: string) => {
  const diff = new Date().getTime() - new Date(createdAt).getTime();
  return diff < 30 * 60 * 1000; // 30 minutes in ms
};

// Helper to get branch color styles
const getBranchStyle = (branch: string) => {
  const b = branch.toLowerCase();
  if (b === "dev")
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
  if (b === "uat")
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800";
  if (b === "master" || b === "main")
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800";
  if (b.startsWith("release"))
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800";
  if (b.includes("hotfix"))
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800";
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
};

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  head: {
    ref: string;
    label: string;
  };
  base: {
    ref: string;
    label: string;
    repo: {
      full_name: string;
    };
  };
}

interface PRListProps {
  pullRequests: PullRequest[];
  loading: boolean;
  onSelectPR: (pr: PullRequest) => void;
  onQuickApprove: (pr: PullRequest) => void;
}

export function PRList({
  pullRequests,
  loading,
  onSelectPR,
  onQuickApprove,
}: PRListProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
    );
  }

  if (pullRequests.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center text-zinc-500 dark:text-zinc-400">
        <GitPullRequest className="mb-4 h-12 w-12 opacity-20" />
        <p className="text-lg font-medium">No pull requests found</p>
        <p className="text-sm">Add some repositories to get started</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {pullRequests.map((pr) => {
        const isRecent = isRecentPR(pr.created_at);

        return (
          <Card
            key={pr.id}
            className={cn(
              "group relative flex flex-col justify-between transition-all w-full cursor-pointer hover:shadow-md",
              isRecent
                ? "border-amber-400/50 shadow-[0_0_15px_-3px_rgba(251,191,36,0.2)] dark:border-amber-500/30"
                : "hover:border-blue-500/50",
            )}
            onClick={() => onSelectPR(pr)}
          >
            {isRecent && (
              <div className="absolute -top-2 -right-2 z-10">
                <Badge
                  variant="outline"
                  className="bg-amber-100 text-amber-700 border-white shadow-sm gap-1 uppercase text-[10px] tracking-wider px-2 py-0.5"
                >
                  <Zap className="h-3 w-3 fill-amber-500 text-amber-500" />{" "}
                  Latest
                </Badge>
              </div>
            )}

            <CardContent className="p-4 flex flex-col h-full justify-between gap-4">
              <div className="space-y-3 w-full">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 font-medium"
                  >
                    {pr.base.repo.full_name}
                  </Badge>
                  <span className="text-xs text-zinc-500">
                    {new Date(pr.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <GitMerge className="h-3 w-3" />
                  <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
                    {pr.head.ref}
                  </span>
                  <span>→</span>
                  <span
                    className={cn(
                      "font-mono px-1.5 py-0.5 rounded border",
                      getBranchStyle(pr.base.ref),
                    )}
                  >
                    {pr.base.ref}
                  </span>
                </div>

                <h3 className="line-clamp-2 font-medium leading-normal text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
                  {pr.title}
                </h3>
              </div>

              <div className="flex w-full items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-900">
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={pr.user.avatar_url} />
                    <AvatarFallback>{pr.user.login.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {pr.user.login}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                    title="Quick Approve (LGTM)"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickApprove(pr);
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-blue-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(pr.html_url, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
