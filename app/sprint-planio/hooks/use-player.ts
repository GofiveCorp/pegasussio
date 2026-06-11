"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useSprintStore } from "../store";
import { getClientId } from "../client-id";
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
      const clientId = getClientId();

      // Fast path: this browser already has a player in the SSR snapshot.
      const fromSSR = initialPlayers.find((p) => p.client_id === clientId);
      if (fromSSR) {
        useSprintStore.getState().setPlayerId(fromSSR.id);
        useSprintStore.getState().onPlayerInsert(fromSSR);
        return;
      }

      // Authoritative: a row may have been created after SSR (e.g. another
      // tab). Reuse it rather than inserting a duplicate.
      const existing = await useSprintStore.getState().resolvePlayerByClient();
      if (existing) return;

      if (initialPlayerName && initialPlayerName !== "Anonymous") {
        await useSprintStore.getState().createPlayer(initialPlayerName);
      }
      // If Anonymous, the GameProvider will show the name prompt (which calls
      // createPlayer — itself idempotent on client_id).
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
