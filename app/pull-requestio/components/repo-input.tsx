"use client";

import { useForm } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface RepoInputProps {
  repos: string[];
  onAddRepo: (repo: string) => void;
  onRemoveRepo: (repo: string) => void;
}

interface RepoFormData {
  repo: string;
}

export function RepoInput({ repos, onAddRepo, onRemoveRepo }: RepoInputProps) {
  const { register, handleSubmit, reset } = useForm<RepoFormData>();

  const onSubmit = (data: RepoFormData) => {
    if (data.repo.trim()) {
      onAddRepo(data.repo.trim());
      reset();
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit(onSubmit)} className="mb-4 flex gap-2">
        <Input
          {...register("repo", { required: true })}
          placeholder="owner/repo (e.g. facebook/react)"
          className="flex-1"
        />
        <Button
          type="submit"
          size="sm"
          className="bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4 mr-2" /> Add
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {repos.map((repo) => (
          <Badge
            key={repo}
            variant="secondary"
            className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-sm bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
          >
            {repo}
            <button
              onClick={() => onRemoveRepo(repo)}
              className="ml-1 rounded-full p-0.5 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {repos.length === 0 && (
          <p className="text-sm text-zinc-400 italic">
            No repositories watched yet.
          </p>
        )}
      </div>
    </div>
  );
}
