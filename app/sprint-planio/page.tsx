"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        const randomId = crypto.randomUUID();
        router.push(
          `/sprint-planio/${randomId}?name=${encodeURIComponent(playerName)}`,
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
          `/sprint-planio/${data.id}?name=${encodeURIComponent(playerName)}`,
        );
      }
    } catch (error: any) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room: " + error.message);
      const randomId = crypto.randomUUID();
      router.push(
        `/sprint-planio/${randomId}?name=${encodeURIComponent(playerName)}`,
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
    try {
      if (cleanId.includes("/") || cleanId.includes("http")) {
        const lastSegment = cleanId.split("?")[0].split("/").pop();
        if (lastSegment) cleanId = lastSegment;
      }
    } catch (e) {
      console.error("Error parsing room ID", e);
    }

    router.push(
      `/sprint-planio/${cleanId}?name=${encodeURIComponent(playerName)}`,
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
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Your Name
            </label>
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name..."
              className="h-12"
            />
          </div>

          <Button
            onClick={handleCreateRoom}
            disabled={loading || !playerName.trim()}
            className="w-full h-12 gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
            size="lg"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
            Create New Room
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white dark:bg-zinc-950 px-2 text-zinc-500">
                Or join existing
              </span>
            </div>
          </div>

          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Paste Room UUID..."
                className="h-12 flex-1"
              />
              <Button
                type="submit"
                disabled={!joinId.trim() || !playerName.trim()}
                variant="secondary"
                size="icon"
                className="h-12 w-12"
              >
                <LogIn className="h-5 w-5" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
