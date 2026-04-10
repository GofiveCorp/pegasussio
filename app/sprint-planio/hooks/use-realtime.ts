"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSprintStore } from "../store";
import { Player, Room, Ticket } from "../types";
import { toast } from "sonner";

/**
 * Single realtime subscription hook.
 * Subscribes once to a Supabase channel and dispatches to store.
 * Dep array is [roomId] only — no re-subscribe loops.
 */
export function useRealtime(roomId: string) {
  const store = useSprintStore;

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      // Room updates
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          store.getState().onRoomUpdate(payload.new as Room);
        },
      )
      // Player inserts
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          store.getState().onPlayerInsert(payload.new as Player);
        },
      )
      // Player updates
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          store.getState().onPlayerUpdate(payload.new as Player);
        },
      )
      // Player deletes (filtered by room_id — requires REPLICA IDENTITY FULL)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const deletedId = payload.old.id;
          const state = store.getState();
          state.onPlayerDelete(deletedId);

          if (deletedId === state.playerId) {
            toast.error("You have been kicked from the room.");
            sessionStorage.removeItem(`sprint-planio-player:${roomId}`);
            state.setPlayerId(null);
            setTimeout(() => {
              window.location.href = "/sprint-planio";
            }, 2000);
          }
        },
      )
      // Ticket inserts
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tickets",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          store.getState().onTicketInsert(payload.new as Ticket);
        },
      )
      // Ticket updates
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          store.getState().onTicketUpdate(payload.new as Ticket);
        },
      )
      // Ticket deletes (filtered by room_id — requires REPLICA IDENTITY FULL)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "tickets",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          store.getState().onTicketDelete(payload.old.id);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);
}
