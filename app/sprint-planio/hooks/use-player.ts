"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useSprintStore } from "../store";
import { Player } from "../types";
import { toast } from "sonner";

/**
 * Handles player join (from sessionStorage or creation),
 * cleanup on disconnect, and leadership race condition sanitizer.
 */
export function usePlayer(roomId: string, initialPlayerName: string, initialPlayers: Player[]) {
  const hasAttemptedJoin = useRef(false);
  const playerId = useSprintStore((s) => s.playerId);

  // Join room
  useEffect(() => {
    if (hasAttemptedJoin.current) return;
    hasAttemptedJoin.current = true;

    const joinAsPlayer = async () => {
      const storageKey = `sprint-planio-player:${roomId}`;
      const storedPlayerId = sessionStorage.getItem(storageKey);

      if (storedPlayerId) {
        // Check initial props first
        const existing = initialPlayers.find((p) => p.id === storedPlayerId);
        if (existing) {
          useSprintStore.getState().setPlayerId(existing.id);
          return;
        }
        // Fallback: check DB
        const { data: remotePlayer } = await supabase
          .from("players")
          .select("*")
          .eq("id", storedPlayerId)
          .single();

        if (remotePlayer) {
          useSprintStore.getState().setPlayerId(remotePlayer.id);
          useSprintStore.getState().onPlayerInsert(remotePlayer);
          return;
        }
      }

      if (initialPlayerName && initialPlayerName !== "Anonymous") {
        await useSprintStore.getState().createPlayer(initialPlayerName);
      }
      // If Anonymous, the GameProvider will show the name prompt
    };

    joinAsPlayer();
  }, [roomId, initialPlayerName, initialPlayers]);

  // Cleanup on disconnect
  useEffect(() => {
    const handleUnload = () => {
      const currentPlayerId = useSprintStore.getState().playerId;
      if (currentPlayerId) {
        navigator.sendBeacon(
          "/api/sprint/leave",
          JSON.stringify({ playerId: currentPlayerId }),
        );
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      const currentPlayerId = useSprintStore.getState().playerId;
      if (currentPlayerId) {
        fetch("/api/sprint/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: currentPlayerId }),
          keepalive: true,
        });
      }
    };
  }, []);

  // Leadership race condition sanitizer
  useEffect(() => {
    const state = useSprintStore.getState();
    if (!state.playerId) return;

    const leaders = state.players.filter((p) => p.is_leader);
    if (leaders.length <= 1) return;

    const sortedLeaders = [...leaders].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    const winner = sortedLeaders[0];
    const isLeader = state.players.find((p) => p.id === state.playerId)?.is_leader;

    if (isLeader && state.playerId !== winner.id) {
      console.warn("Duplicate leader detected. Resolving race condition...");
      supabase
        .from("players")
        .update({ is_leader: false })
        .eq("id", state.playerId)
        .then(({ error }) => {
          if (!error) {
            toast.info("Leadership race resolved: You are now a member.");
          }
        });
    }
  }, [playerId]);

  return { needsNamePrompt: !playerId && (!initialPlayerName || initialPlayerName === "Anonymous") };
}
