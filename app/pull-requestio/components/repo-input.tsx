"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RepoInputProps {
  repos: string[];
  onAddRepo: (repo: string) => void;
  onRemoveRepo: (repo: string) => void;
}

export function RepoInput({ repos, onAddRepo, onRemoveRepo }: RepoInputProps) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    if (input.trim() && !repos.includes(input.trim())) {
      onAddRepo(input.trim());
      setInput("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="owner/repo (e.g. facebook/react)"
          className="flex-1"
        />
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {repos.map((repo) => (
          <Badge
            key={repo}
            variant="secondary"
            className="pl-3 pr-1 py-1 gap-1 text-sm font-normal"
          >
            <span>{repo}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemoveRepo(repo)}
              className="h-5 w-5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-500"
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
