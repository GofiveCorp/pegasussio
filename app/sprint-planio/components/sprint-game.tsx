"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { SprintHeader } from "./sprint-header";
import { SprintBoard } from "./sprint-board";
import { SprintSidebar } from "./sprint-sidebar";
import { Player, Room, Ticket, VoteSnapshot } from "../types";
import { useSprintStore, DEFAULT_DECK } from "../store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SprintGameProps {
  roomId: string;
  initialRoomState: Room | null;
  initialPlayers: Player[];
  initialTickets: Ticket[];
  initialPlayerName: string;
}

export function SprintGame({
  roomId,
  initialRoomState,
  initialPlayers,
  initialTickets,
  initialPlayerName,
}: SprintGameProps) {
  const {
    setRoomId,
    setPlayerId,
    setPlayers,
    setTickets,
    setRoomState,
    setDeck,
    setSelectedVote,
    selectedVote: selected,
    players,
    tickets,
    roomState,
    playerId,
    deck,
  } = useSprintStore();

  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const hasAttemptedJoin = useRef(false);

  // Initialize Store with Server Data
  useEffect(() => {
    setRoomId(roomId);
    if (initialRoomState) {
      setRoomState(initialRoomState);
      if (initialRoomState.card_deck) {
        setDeck(initialRoomState.card_deck);
      }
    }
    setPlayers(initialPlayers);
    setTickets(initialTickets);
  }, [
    roomId,
    initialRoomState,
    initialPlayers,
    initialTickets,
    setRoomId,
    setRoomState,
    setPlayers,
    setTickets,
    setDeck,
  ]);

  // Join Room Logic (Client Side to handle Session Storage & Self Player)
  useEffect(() => {
    if (hasAttemptedJoin.current) return;
    hasAttemptedJoin.current = true;

    const joinAsPlayer = async () => {
      // 3. Manage Player (Join)
      const storageKey = `sprint-planio-player:${roomId}`;
      // Try session storage first
      const storedPlayerId = sessionStorage.getItem(storageKey);

      if (storedPlayerId) {
        // Verify existing player
        const existing = initialPlayers.find((p) => p.id === storedPlayerId);
        if (existing) {
          setPlayerId(existing.id);
          return;
        }
        // Or verify against DB if not in initial list (edge case)
        const { data: remotePlayer } = await supabase
          .from("players")
          .select("*")
          .eq("id", storedPlayerId)
          .single();
        if (remotePlayer) {
          setPlayerId(remotePlayer.id);
          setPlayers((prev) => [...prev, remotePlayer]);
          return;
        }
      }

      // Create new player if name provided and not found
      if (initialPlayerName && initialPlayerName !== "Anonymous") {
        await createPlayer(initialPlayerName);
      } else {
        // If name is Anonymous (or missing), show prompt
        setShowNamePrompt(true);
      }
    };

    joinAsPlayer();
  }, [roomId, initialPlayerName, initialPlayers, setPlayerId, setPlayers]);

  const createPlayer = async (name: string) => {
    const storageKey = `sprint-planio-player:${roomId}`;

    // Check if there are any players in the room to determine leadership
    const { count } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomId);

    const isFirstPlayer = count === 0;

    const { data: playerData } = await supabase
      .from("players")
      .insert([
        {
          room_id: roomId,
          name: name,
          is_leader: isFirstPlayer, // Set leader if first
        },
      ])
      .select()
      .single();

    if (playerData) {
      setPlayerId(playerData.id);
      setPlayers((prev) => {
        if (prev.some((p) => p.id === playerData.id)) return prev;
        return [...prev, playerData];
      });
      sessionStorage.setItem(storageKey, playerData.id);
      setShowNamePrompt(false);
    }
  };

  // Cleanup on unmount or tab close
  useEffect(() => {
    const handleUnload = () => {
      if (playerId) {
        const payload = JSON.stringify({ playerId });
        navigator.sendBeacon("/api/sprint/leave", payload);
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      // Also cleanup on component unmount (SPA navigation)
      if (playerId) {
        // We use fetch with keepalive here for reliability during unmount
        fetch("/api/sprint/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId }),
          keepalive: true,
        });
      }
    };
  }, [playerId]);

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
          event: "INSERT",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setPlayers((prev) =>
            prev.some((p) => p.id === (payload.new as Player).id)
              ? prev
              : [...prev, payload.new as Player],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setPlayers((prev) =>
            prev.map((p) =>
              p.id === (payload.new as Player).id ? (payload.new as Player) : p,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "players",
        },
        (payload) => {
          const deletedId = payload.old.id;
          setPlayers((prev) => prev.filter((p) => p.id !== deletedId));

          if (deletedId === playerId) {
            toast.error("You have been kicked from the room.");
            sessionStorage.removeItem(`sprint-planio-player:${roomId}`);
            setPlayerId(null);
            // Optional: redirect to home after a delay or show state
            setTimeout(() => {
              window.location.href = "/sprint-planio";
            }, 2000);
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
  }, [roomId, deck, playerId, setPlayers, setRoomState, setTickets, setDeck]);

  // Derived Values
  const activeTicket = tickets.find(
    (t) => t.id === roomState?.active_ticket_id,
  );
  const isViewOnly = activeTicket?.status === "completed";
  const isLeader = players.find((p) => p.id === playerId)?.is_leader || false;

  // Actions
  const handleSelect = async (value: string) => {
    if (isViewOnly || roomState?.is_revealed) return;

    if (selected === value) {
      setSelectedVote(null);
      if (playerId)
        await supabase
          .from("players")
          .update({ vote: null })
          .eq("id", playerId);
    } else {
      setSelectedVote(value);
      if (playerId)
        await supabase
          .from("players")
          .update({ vote: value })
          .eq("id", playerId);
    }
  };

  const handleReveal = async () => {
    await supabase.from("rooms").update({ is_revealed: true }).eq("id", roomId);

    // Auto-save average after delay
    const numericVotes = players
      .map((p) => parseFloat(p.vote || "0"))
      .filter((v) => !isNaN(v) && v > 0);

    if (numericVotes.length > 0) {
      const avg = (
        numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length
      ).toFixed(1);

      const snapshot = players
        .filter((p) => p.vote)
        .map((p) => ({ id: p.id, name: p.name, vote: p.vote! }));

      // Immediate auto-save
      await handleSaveScore(avg);
    }
  };

  const handleReset = async () => {
    setSelectedVote(null);
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
    } else {
      toast.success("Score saved!");

      // Auto-advance
      const currentIndex = tickets.findIndex(
        (t) => t.id === roomState.active_ticket_id,
      );
      if (currentIndex !== -1) {
        // Optimized O(N) search with wrap-around
        let nextTicket: Ticket | undefined;

        // 1. Search forward from next index
        for (let i = currentIndex + 1; i < tickets.length; i++) {
          if (tickets[i].status !== "completed" && !tickets[i].score) {
            nextTicket = tickets[i];
            break;
          }
        }

        // 2. Wrap-around search from start
        if (!nextTicket) {
          for (let i = 0; i < currentIndex; i++) {
            if (tickets[i].status !== "completed" && !tickets[i].score) {
              nextTicket = tickets[i];
              break;
            }
          }
        }

        if (nextTicket) {
          // Wait a bit to ensuring UI updates or toast is seen
          setTimeout(() => {
            handleSetActiveTicket(nextTicket, true);
          }, 300);
        }
      }
    }
  };

  const handleSetActiveTicket = async (
    ticket: Ticket,
    skipAutoSave = false,
  ) => {
    // Auto-save if revealed and not skipped
    if (
      !skipAutoSave &&
      roomState?.is_revealed &&
      roomState.active_ticket_id &&
      roomState.active_ticket_id !== ticket.id
    ) {
      const numericVotes = players
        .map((p) => parseFloat(p.vote || "0"))
        .filter((v) => !isNaN(v) && v > 0);

      if (numericVotes.length > 0) {
        const avg = (
          numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length
        ).toFixed(1);
        await handleSaveScore(avg);
      }
    }

    setSelectedVote(null);

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
    setSelectedVote(null);

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
      <SprintHeader onSaveSettings={handleSaveSettings} onReset={handleReset} />

      <main className="flex-1 flex flex-col lg:flex-row p-6 gap-8 max-w-7xl mx-auto w-full">
        <SprintBoard
          onSelect={handleSelect}
          onReveal={handleReveal}
          onSaveScore={handleSaveScore}
          isLeader={isLeader}
        />
        <SprintSidebar
          onAddTicket={handleAddTicket}
          onDeleteTicket={handleDeleteTicket}
          onRenameTicket={handleRenameTicket}
          onSetActiveTicket={handleSetActiveTicket}
          onRevote={handleRevote}
          onUpdateScore={handleUpdateTicketScore}
          onTransferLeadership={async (targetPlayerId) => {
            if (!playerId) return;

            // Optimistic update
            setPlayers((prev) =>
              prev.map((p) => {
                if (p.id === playerId) return { ...p, is_leader: false };
                if (p.id === targetPlayerId) return { ...p, is_leader: true };
                return p;
              }),
            );

            // DB Update
            await supabase
              .from("players")
              .update({ is_leader: false })
              .eq("id", playerId);
            await supabase
              .from("players")
              .update({ is_leader: true })
              .eq("id", targetPlayerId);

            toast.success("Leadership transferred");
          }}
          onKickPlayer={async (targetPlayerId) => {
            const { error } = await supabase
              .from("players")
              .delete()
              .eq("id", targetPlayerId);
            if (error) {
              toast.error("Failed to kick player");
            } else {
              toast.success("Player kicked");
            }
          }}
        />
      </main>

      <Dialog open={showNamePrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter your name</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              ref={nameInputRef}
              placeholder="Your Name"
              onKeyDown={(e) => {
                if (e.key === "Enter" && nameInputRef.current?.value) {
                  createPlayer(nameInputRef.current.value);
                }
              }}
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (nameInputRef.current?.value) {
                  createPlayer(nameInputRef.current.value);
                }
              }}
            >
              Join Room
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
