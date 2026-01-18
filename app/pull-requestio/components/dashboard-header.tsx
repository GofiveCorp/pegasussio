"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Key, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ModeToggle } from "@/components/mode-toggle";
import { User } from "../types";

interface DashboardHeaderProps {
  token: string;
  setToken: (token: string) => void;
  repoCount: number;
  onRefresh: () => void;
  loading: boolean;
  user: User | null;
}

export function DashboardHeader({
  token,
  setToken,
  repoCount,
  onRefresh,
  loading,
  user,
}: DashboardHeaderProps) {
  return (
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
              Dashboard for {repoCount} repositories
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
            onClick={onRefresh}
            disabled={loading}
            className="rounded-full"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
    </header>
  );
}
