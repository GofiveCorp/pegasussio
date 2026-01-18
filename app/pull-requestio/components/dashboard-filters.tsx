"use client";

import { Pin, X, Search, GitBranch, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect, SelectOption } from "./multi-select";
import { useState } from "react";

interface DashboardFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedBranches: string[];
  setSelectedBranches: (branches: string[]) => void;
  visibleBranches: string[];
  moreBranches: string[];
  pinnedBranches: string[];
  setPinnedBranches: (branches: string[]) => void;
  prOwners: SelectOption[];
  selectedOwners: string[];
  setSelectedOwners: (owners: string[]) => void;
}

export function DashboardFilters({
  searchQuery,
  setSearchQuery,
  selectedBranches,
  setSelectedBranches,
  visibleBranches,
  moreBranches,
  pinnedBranches,
  setPinnedBranches,
  prOwners,
  selectedOwners,
  setSelectedOwners,
}: DashboardFiltersProps) {
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);

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

  const getBranchColor = (branch: string) => {
    const b = branch.toLowerCase();
    if (b === "develop")
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

  const handleToggleBranch = (branch: string) => {
    if (selectedBranches.includes(branch)) {
      setSelectedBranches(selectedBranches.filter((b) => b !== branch));
    } else {
      setSelectedBranches([...selectedBranches, branch]);
    }
  };

  const handleTogglePin = (branch: string) => {
    // If it's a priority branch, adding it to pinned doesn't change sort order much if logic stays same,
    // but user might want to explicitly pin non-priority ones.
    // The original logic allowed pinning any branch.

    if (pinnedBranches.includes(branch)) {
      setPinnedBranches(pinnedBranches.filter((b) => b !== branch));
    } else {
      setPinnedBranches([...pinnedBranches, branch]);
    }
  };

  return (
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
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMoreDropdown(false)}
                />
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
                          setShowMoreDropdown(false);
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
              </>
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
  );
}
