"use client";

import { useEffect, useState, use, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { SprintHeader } from "../components/sprint-header";
import { SprintBoard } from "../components/sprint-board";
import { SprintSidebar } from "../components/sprint-sidebar";
import { Player, Room, Ticket, VoteSnapshot } from "../types";

const DEFAULT_DECK = [
  "0",
  "1",
  "2",
  "3",
  "5",
  "8",
  "13",
  "21",
  "34",
  "55",
  "89",
  "?",
  "☕",
];

function SprintPlanioGameContent({ roomId }: { roomId: string }) {
  const searchParams = useSearchParams();
  const playerName = searchParams.get("name") || "Anonymous";

  // Local State
  const [selected, setSelected] = useState<string | null>(null);

  // Multiplayer State
  const [players, setPlayers] = useState<Player[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [roomState, setRoomState] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [deck, setDeck] = useState<string[]>(DEFAULT_DECK);

  const hasAttemptedJoin = useRef(false);

  // Initial Join Logic
  useEffect(() => {
    if (hasAttemptedJoin.current) return;
    hasAttemptedJoin.current = true;

    const joinRoom = async () => {
      // 1. Check/Create Room
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (roomError || !roomData) {
        const { error: createError } = await supabase
          .from("rooms")
          .insert([{ id: roomId, status: "active", card_deck: DEFAULT_DECK }]);

        if (createError) {
          const { data: retryData } = await supabase
            .from("rooms")
            .select("*")
            .eq("id", roomId)
            .single();
          if (!retryData) {
            toast.error("Failed to join room. Please try again.");
            return;
          }
          setRoomState(retryData);
          if (retryData.card_deck) setDeck(retryData.card_deck);
        } else {
          setRoomState({ id: roomId, is_revealed: false });
        }
      } else {
        setRoomState(roomData);
        if (roomData.card_deck) setDeck(roomData.card_deck);
      }

      // 2. Fetch Initial Data (Tickets & Existing Players)
      const [pUsers, pTickets] = await Promise.all([
        supabase.from("players").select("*").eq("room_id", roomId),
        supabase
          .from("tickets")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: true }),
      ]);

      if (pTickets.data) setTickets(pTickets.data as Ticket[]);

      let currentPlayers = pUsers.data ? (pUsers.data as Player[]) : [];
      setPlayers(currentPlayers);

      // 3. Manage Player (Join)
      const storageKey = `sprint-planio-player:${roomId}`;
      const storedPlayerId = sessionStorage.getItem(storageKey);

      let finalPlayerId: string | null = null;

      if (storedPlayerId) {
        const { data: existingPlayer } = await supabase
          .from("players")
          .select("*")
          .eq("id", storedPlayerId)
          .single();
        if (existingPlayer) {
          setPlayerId(existingPlayer.id);
          finalPlayerId = existingPlayer.id;
          if (!currentPlayers.some((p) => p.id === finalPlayerId)) {
            setPlayers((prev) => [...prev, existingPlayer]);
          }
          return;
        }
      }

      const { data: playerData } = await supabase
        .from("players")
        .insert([{ room_id: roomId, name: playerName }])
        .select()
        .single();

      if (playerData) {
        setPlayerId(playerData.id);
        finalPlayerId = playerData.id;
        setPlayers((prev) => {
          if (prev.some((p) => p.id === playerData.id)) return prev;
          return [...prev, playerData];
        });
        sessionStorage.setItem(storageKey, playerData.id);
      }
    };

    joinRoom();
  }, [roomId, playerName]);

  // Subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const newRoom = payload.new as Room;
          setRoomState(newRoom);
          if (
            newRoom.card_deck &&
            JSON.stringify(newRoom.card_deck) !== JSON.stringify(deck)
          ) {
            setDeck(newRoom.card_deck);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          // ... (Player updates logic same as before)
          if (payload.eventType === "INSERT") {
            setPlayers((prev) =>
              prev.some((p) => p.id === (payload.new as Player).id)
                ? prev
                : [...prev, payload.new as Player],
            );
          } else if (payload.eventType === "UPDATE") {
            setPlayers((prev) =>
              prev.map((p) =>
                p.id === (payload.new as Player).id
                  ? (payload.new as Player)
                  : p,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        },
      )
      // Ticket Updates (INSERT/UPDATE)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tickets",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setTickets((prev) => [...prev, payload.new as Ticket]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setTickets((prev) =>
            prev.map((t) =>
              t.id === (payload.new as Ticket).id ? (payload.new as Ticket) : t,
            ),
          );
        },
      )
      // Ticket Deletes (Unfiltered, check existence)
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tickets" },
        (payload) => {
          setTickets((prev) => {
            if (prev.some((t) => t.id === payload.old.id)) {
              return prev.filter((t) => t.id !== payload.old.id);
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, deck]); // Added deck to dependency to avoid stale closure if needed, though state update handles it

  // Derived Values
  const activeTicket = tickets.find(
    (t) => t.id === roomState?.active_ticket_id,
  );
  const isViewOnly = activeTicket?.status === "completed";

  // Actions
  const handleSelect = async (value: string) => {
    if (isViewOnly || roomState?.is_revealed) return;

    if (selected === value) {
      setSelected(null);
      if (playerId)
        await supabase
          .from("players")
          .update({ vote: null })
          .eq("id", playerId);
    } else {
      setSelected(value);
      if (playerId)
        await supabase
          .from("players")
          .update({ vote: value })
          .eq("id", playerId);
    }
  };

  const handleReveal = async () => {
    await supabase.from("rooms").update({ is_revealed: true }).eq("id", roomId);
  };

  const handleReset = async () => {
    setSelected(null);
    await supabase
      .from("rooms")
      .update({ is_revealed: false })
      .eq("id", roomId);
    await supabase.from("players").update({ vote: null }).eq("room_id", roomId);
  };

  const handleAddTicket = async (title: string) => {
    const { error } = await supabase.from("tickets").insert([
      {
        room_id: roomId,
        title: title,
        status: "pending",
      },
    ]);

    if (error) toast.error("Failed to add ticket");
  };

  const handleRenameTicket = async (id: string, newTitle: string) => {
    const { error } = await supabase
      .from("tickets")
      .update({ title: newTitle })
      .eq("id", id);

    if (error) toast.error("Failed to rename ticket");
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm("Are you sure you want to delete this agenda?")) return;

    if (activeTicket?.id === ticketId) {
      await supabase
        .from("rooms")
        .update({ active_ticket_id: null, is_revealed: false })
        .eq("id", roomId);
    }

    const { error } = await supabase
      .from("tickets")
      .delete()
      .eq("id", ticketId);
    if (error) toast.error("Failed to delete ticket");
    else {
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      toast.success("Agenda deleted");
    }
  };

  const handleSetActiveTicket = async (ticket: Ticket) => {
    setSelected(null);

    const isCompleted = ticket.status === "completed";
    const updates: any = { active_ticket_id: ticket.id };

    if (!isCompleted) {
      updates.is_revealed = false;
    }

    await supabase.from("rooms").update(updates).eq("id", roomId);

    if (!isCompleted) {
      await supabase
        .from("tickets")
        .update({ status: "active" })
        .eq("id", ticket.id);
      await supabase
        .from("players")
        .update({ vote: null })
        .eq("room_id", roomId);
    }
  };

  const handleSaveScore = async (scoreToSave: string) => {
    if (!roomState?.active_ticket_id || !scoreToSave) return;

    const snapshot: VoteSnapshot[] = players
      .filter((p) => p.vote)
      .map((p) => ({ id: p.id, name: p.name, vote: p.vote! }));

    const { error } = await supabase
      .from("tickets")
      .update({
        score: scoreToSave,
        status: "completed",
        votes_snapshot: snapshot,
      })
      .eq("id", roomState.active_ticket_id);

    if (error) {
      console.error(error);
      toast.error("Failed to save score");
    } else toast.success("Score saved!");
  };

  const handleUpdateTicketScore = async (id: string, score: string) => {
    const { error } = await supabase
      .from("tickets")
      .update({ score: score })
      .eq("id", id);

    if (error) toast.error("Failed to update score");
  };

  const handleRevote = async (ticket: Ticket) => {
    await supabase
      .from("rooms")
      .update({ active_ticket_id: ticket.id, is_revealed: false })
      .eq("id", roomId);
    await supabase
      .from("tickets")
      .update({ status: "active", score: null, votes_snapshot: null })
      .eq("id", ticket.id);
    await supabase.from("players").update({ vote: null }).eq("room_id", roomId);
    setSelected(null);

    toast.info(`Revoting on ${ticket.title}`);
  };

  const handleSaveSettings = async (newDeck: string[]) => {
    const { error } = await supabase
      .from("rooms")
      .update({ card_deck: newDeck })
      .eq("id", roomId);
    if (error) toast.error("Failed to update settings");
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col">
      <SprintHeader
        roomId={roomId}
        deck={deck}
        onSaveSettings={handleSaveSettings}
        onReset={handleReset}
      />

      <main className="flex-1 flex flex-col lg:flex-row p-6 gap-8 max-w-7xl mx-auto w-full">
        <SprintBoard
          roomId={roomId}
          players={players}
          activeTicket={activeTicket}
          roomState={roomState}
          playerId={playerId}
          selected={selected}
          deck={deck}
          onSelect={handleSelect}
          onReveal={handleReveal}
          onSaveScore={handleSaveScore}
        />
        <SprintSidebar
          tickets={tickets}
          players={players}
          activeTicket={activeTicket}
          roomState={roomState}
          playerId={playerId}
          onAddTicket={handleAddTicket}
          onDeleteTicket={handleDeleteTicket}
          onRenameTicket={handleRenameTicket}
          onSetActiveTicket={handleSetActiveTicket}
          onRevote={handleRevote}
          onUpdateScore={handleUpdateTicketScore}
        />
      </main>
    </div>
  );
}

export default function SprintPlanioPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SprintPlanioGameContent roomId={resolvedParams.roomId} />
    </Suspense>
  );
}
