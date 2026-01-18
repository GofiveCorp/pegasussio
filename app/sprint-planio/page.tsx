"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function SprintPlanioLobby() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [playerName, setPlayerName] = useState("");

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name first");
      return;
    }

    setLoading(true);
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        // Fallback for demo/offline: generate random ID
        const randomId = crypto.randomUUID();
        // Save name to local storage or URL param? URL param is easier for now to pass to next page
        router.push(
          `/sprint-planio/${randomId}?name=${encodeURIComponent(playerName)}`
        );
        return;
      }

      const { data, error } = await supabase
        .from("rooms")
        .insert([{ status: "active" }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        router.push(
          `/sprint-planio/${data.id}?name=${encodeURIComponent(playerName)}`
        );
      }
    } catch (error: any) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room: " + error.message);
      // Fallback
      const randomId = crypto.randomUUID();
      router.push(
        `/sprint-planio/${randomId}?name=${encodeURIComponent(playerName)}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinId.trim() || !playerName.trim()) {
      toast.error("Please enter both Room ID and your Name");
      return;
    }

    let cleanId = joinId.trim();
    // Handle pasted URL (e.g. http://localhost:3000/sprint-planio/uuid...)
    try {
      if (cleanId.includes("/") || cleanId.includes("http")) {
        // If it looks like a URL, try to extract the last path segment
        const lastSegment = cleanId.split("?")[0].split("/").pop();
        if (lastSegment) cleanId = lastSegment;
      }
    } catch (e) {
      console.error("Error parsing room ID", e);
    }

    router.push(
      `/sprint-planio/${cleanId}?name=${encodeURIComponent(playerName)}`
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-white text-zinc-500 shadow-sm hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors mb-6"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Sprint Planio
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Multiplayer Planning Poker
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-950 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 space-y-8">
          {/* Player Name Input (Global) */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white dark:bg-zinc-950 px-2 text-zinc-500">
                Or
              </span>
            </div>
          </div>

          {/* Create Room */}
          <button
            onClick={handleCreateRoom}
            disabled={loading || !playerName.trim()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
            Create New Room
          </button>

          {/* Join Room */}
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Join Existing Room
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  placeholder="Room UUID..."
                  className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!joinId.trim() || !playerName.trim()}
                  className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 px-6 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <LogIn className="h-5 w-5" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
