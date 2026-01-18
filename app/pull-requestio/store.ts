import { create } from "zustand";
import { PullRequest, User } from "./types";
import { SelectOption } from "./components/multi-select";

interface DashboardState {
  token: string;
  user: User | null;
  repos: string[];
  pullRequests: PullRequest[];
  loading: boolean;
  error: string | null;

  // Filters
  searchQuery: string;
  selectedBranches: string[];
  pinnedBranches: string[];
  selectedOwners: string[];

  // Actions
  setToken: (token: string) => void;
  setUser: (user: User | null) => void;
  setRepos: (repos: string[] | ((prev: string[]) => string[])) => void;
  setPullRequests: (prs: PullRequest[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  setSearchQuery: (query: string) => void;
  setSelectedBranches: (branches: string[]) => void;
  setPinnedBranches: (branches: string[]) => void;
  setSelectedOwners: (owners: string[]) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  token: "",
  user: null,
  repos: [],
  pullRequests: [],
  loading: false,
  error: null,

  searchQuery: "",
  selectedBranches: [],
  pinnedBranches: [],
  selectedOwners: [],

  setToken: (token) => set({ token }),
  setUser: (user) => set({ user }),
  setRepos: (repos) =>
    set((state) => ({
      repos: typeof repos === "function" ? repos(state.repos) : repos,
    })),
  setPullRequests: (pullRequests) => set({ pullRequests }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedBranches: (selectedBranches) => set({ selectedBranches }),
  setPinnedBranches: (pinnedBranches) => set({ pinnedBranches }),
  setSelectedOwners: (selectedOwners) => set({ selectedOwners }),
}));
