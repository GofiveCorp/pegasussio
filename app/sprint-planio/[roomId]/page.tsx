"use client";

import { useEffect, useState, use, Suspense, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Eye,
  Users,
  Copy,
  Check,
  Settings,
  X,
  Save,
  List,
  Play,
  CheckCircle,
  Plus,
  Pencil,
  RotateCcw,
  Trash2,
  Edit3,
} from "lucide-react";
import { PokerCard } from "../components/poker-card";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/mode-toggle";

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

interface Player {
  id: string;
  name: string;
  vote: string | null;
  is_spectator: boolean;
}

interface Room {
  id: string;
  is_revealed: boolean;
  agenda_title?: string;
  card_deck?: string[];
  active_ticket_id?: string;
}

interface VoteSnapshot {
  name: string;
  vote: string;
  id: string;
}

interface Ticket {
  id: string;
  title: string;
  score: string | null;
  status: "pending" | "active" | "completed";
  votes_snapshot?: VoteSnapshot[];
}

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
  const [isCopied, setIsCopied] = useState(false);
  const [deck, setDeck] = useState<string[]>(DEFAULT_DECK);

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [tempDeck, setTempDeck] = useState("");
  const [newTicketTitle, setNewTicketTitle] = useState("");

  // Scoring & Editing State
  const [customScore, setCustomScore] = useState("");
  const [editingTicket, setEditingTicket] = useState<{
    id: string;
    title: string;
    score: string;
  } | null>(null);
  const [renamingTicket, setRenamingTicket] = useState<{
    id: string;
    title: string;
  } | null>(null);

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
  }, [roomId]);

  // Derived Values
  const activeTicket = tickets.find(
    (t) => t.id === roomState?.active_ticket_id,
  );
  const isViewOnly = activeTicket?.status === "completed";
  const revealed = isViewOnly ? true : roomState?.is_revealed;

  const displayPlayers =
    isViewOnly && activeTicket?.votes_snapshot
      ? activeTicket.votes_snapshot.map(
          (s) =>
            ({
              id: s.id,
              name: s.name,
              vote: s.vote,
              is_spectator: false,
            }) as Player,
        )
      : players;

  const numericVotes = displayPlayers
    .map((p) => parseFloat(p.vote || "0"))
    .filter((v) => !isNaN(v) && v > 0);
  const average =
    numericVotes.length > 0
      ? (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(
          1,
        )
      : null;
  const displayAverage =
    isViewOnly && activeTicket?.score ? activeTicket.score : average;

  // Initialize custom score
  useEffect(() => {
    if (revealed && average && !isViewOnly) {
      setCustomScore(average);
    }
  }, [revealed, average, isViewOnly]);

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

  const handleAddTicket = async () => {
    if (!newTicketTitle.trim()) return;

    const { error } = await supabase.from("tickets").insert([
      {
        room_id: roomId,
        title: newTicketTitle,
        status: "pending",
      },
    ]);

    if (error) toast.error("Failed to add ticket");
    else {
      setNewTicketTitle("");
      setShowAddTicket(false);
    }
  };

  const handleRenameTicket = async () => {
    if (!renamingTicket || !renamingTicket.title.trim()) return;

    const { error } = await supabase
      .from("tickets")
      .update({ title: renamingTicket.title })
      .eq("id", renamingTicket.id);

    if (error) toast.error("Failed to rename ticket");
    else setRenamingTicket(null);
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

  // Save Score + Snapshot
  const handleSaveScore = async () => {
    const scoreToSave = customScore || average;
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

  const handleUpdateTicketScore = async () => {
    if (!editingTicket) return;

    const { error } = await supabase
      .from("tickets")
      .update({ score: editingTicket.score })
      .eq("id", editingTicket.id);

    if (error) toast.error("Failed to update score");
    else setEditingTicket(null);
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

  const handleSaveSettings = async () => {
    const cleanDeck = tempDeck
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (cleanDeck.length === 0) {
      toast.error("Deck cannot be empty");
      return;
    }

    const { error } = await supabase
      .from("rooms")
      .update({ card_deck: cleanDeck })
      .eq("id", roomId);
    if (error) toast.error("Failed to update settings");
    else setShowSettings(false);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setIsCopied(true);
    toast.success("Room ID copied!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/sprint-planio">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Sprint Planio
            </h1>
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              Room: <span className="font-mono">{roomId.slice(0, 8)}...</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setTempDeck(deck.join(", "));
              setShowSettings(true);
            }}
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={copyRoomId}
            title="Copy Room ID"
          >
            {isCopied ? (
              <Check className="h-5 w-5" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </header>

      {/* Banner: Active Ticket */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-4 px-6 text-center">
        {activeTicket ? (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center justify-center gap-2">
              <span className="text-blue-500">#{activeTicket.title}</span>
              {isViewOnly && <Badge variant="secondary">View Only</Badge>}
            </h2>
            {activeTicket.score && (
              <Badge
                variant="outline"
                className="mt-2 text-lg px-3 py-1 bg-green-50 text-green-700 border-green-200"
              >
                Score: {activeTicket.score}
              </Badge>
            )}
          </div>
        ) : (
          <p className="text-zinc-400 italic">
            No agenda selected. Choose one from the list.
          </p>
        )}
      </div>

      <main className="flex-1 flex flex-col lg:flex-row p-6 gap-8 max-w-7xl mx-auto w-full">
        {/* CENTER: Stage */}
        <div className="flex-1 flex flex-col items-center gap-8">
          <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[300px]">
            {/* Players Grid (or Snapshots) */}
            <div className="flex flex-wrap justify-center gap-6 animate-in fade-in zoom-in duration-300 mb-8">
              {displayPlayers.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div
                    className={cn(
                      "relative h-28 w-20 sm:h-32 sm:w-24 rounded-xl border-2 flex items-center justify-center shadow-xl transition-all duration-300 transform",
                      revealed &&
                        p.vote &&
                        "border-blue-600 bg-white dark:bg-zinc-900 dark:border-blue-500 rotate-y-0",
                      revealed &&
                        !p.vote &&
                        "border-zinc-200 bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 opacity-50",
                      !revealed &&
                        p.vote &&
                        "border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-600 scale-105",
                      !revealed &&
                        !p.vote &&
                        "border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50",
                    )}
                  >
                    {revealed ? (
                      <span
                        className={cn(
                          "text-3xl sm:text-4xl font-bold",
                          p.vote
                            ? "text-blue-600 dark:text-blue-500"
                            : "text-zinc-400",
                        )}
                      >
                        {p.vote ?? "-"}
                      </span>
                    ) : p.vote ? (
                      <span className="text-white font-bold opacity-50 tracking-widest text-[10px]">
                        READY
                      </span>
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-700 text-xl font-bold animate-pulse">
                        ?
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs sm:text-sm font-medium truncate max-w-[100px]",
                      p.id === playerId ? "text-blue-600" : "text-zinc-500",
                    )}
                  >
                    {p.name} {p.id === playerId && "(You)"}
                  </span>
                </div>
              ))}
              {/* Fallback msg if snapshot empty */}
              {isViewOnly && displayPlayers.length === 0 && (
                <p className="text-zinc-400 italic">
                  No votes recorded for this session.
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-6">
              {!isViewOnly &&
                !revealed &&
                (selected || players.some((p) => p.vote)) && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 text-center">
                    <Button
                      size="lg"
                      onClick={handleReveal}
                      className="rounded-full shadow-lg gap-2 px-8"
                    >
                      <Eye className="h-5 w-5" /> Reveal Cards
                    </Button>
                    <p className="text-xs mt-2 text-zinc-400">
                      {players.filter((p) => p.vote).length}/{players.length}{" "}
                      voted
                    </p>
                  </div>
                )}

              {revealed && (displayAverage || average) && (
                <div className="flex flex-col items-center animate-in zoom-in duration-300">
                  <div className="bg-blue-50 dark:bg-blue-900/20 px-8 py-4 rounded-3xl border border-blue-100 dark:border-blue-800 flex flex-col items-center mb-4">
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider mb-1">
                      {isViewOnly ? "Final Score" : "Average"}
                    </p>
                    <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">
                      {displayAverage}
                    </p>
                  </div>

                  {/* Save Custom Score */}
                  {activeTicket && !activeTicket.score && !isViewOnly && (
                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg">
                      <Input
                        type="text"
                        value={customScore}
                        onChange={(e) => setCustomScore(e.target.value)}
                        className="w-20 text-center font-bold text-lg border-none focus-visible:ring-0 shadow-none bg-transparent"
                        placeholder={average || "-"}
                      />
                      <Button
                        onClick={handleSaveScore}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Hand (Disable if ViewOnly) */}
          <div
            className={cn(
              "w-full max-w-3xl border-t border-zinc-200 dark:border-zinc-800 pt-8",
              isViewOnly && "opacity-50 pointer-events-none grayscale",
            )}
          >
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {deck.map((val) => (
                <PokerCard
                  key={val}
                  value={val}
                  selected={selected === val}
                  onClick={() => handleSelect(val)}
                  className={cn(
                    revealed &&
                      selected !== val &&
                      "opacity-25 grayscale cursor-not-allowed",
                    revealed && selected === val && "ring-4 ring-blue-500",
                  )}
                />
              ))}
            </div>
            {isViewOnly && (
              <p className="text-center text-xs text-zinc-400 mt-2">
                Voting is closed for this ticket.
              </p>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="w-full lg:w-80 flex flex-col gap-8 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 pt-8 lg:pt-0 lg:pl-8">
          {/* AGENDA SECTION */}
          <Card className="flex-1 flex flex-col border-none shadow-none bg-transparent">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500">
                <List className="h-4 w-4" /> Agenda
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddTicket(!showAddTicket)}
                className="h-6 w-6"
              >
                {showAddTicket ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>

            {showAddTicket && (
              <Card className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-900 border-dashed">
                <Input
                  value={newTicketTitle}
                  onChange={(e) => setNewTicketTitle(e.target.value)}
                  placeholder="Enter ticket title..."
                  className="mb-2 bg-white dark:bg-black"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTicket();
                    if (e.key === "Escape") setShowAddTicket(false);
                  }}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAddTicket(false)}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddTicket}>
                    Add
                  </Button>
                </div>
              </Card>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 max-h-[500px]">
              {tickets.length === 0 && !showAddTicket ? (
                <div className="text-center py-8 text-zinc-400 text-sm">
                  <p>No agenda items yet.</p>
                  <Button
                    variant="link"
                    className="mt-2 text-blue-500"
                    onClick={() => setShowAddTicket(true)}
                  >
                    Add First Ticket
                  </Button>
                </div>
              ) : (
                tickets.map((t) => {
                  const isActive = activeTicket?.id === t.id;
                  const isCompleted = t.status === "completed";

                  return (
                    <Card
                      key={t.id}
                      className={cn(
                        "group p-3 transition-all cursor-pointer hover:shadow-md border-transparent hover:border-zinc-200 dark:hover:border-zinc-800",
                        isActive &&
                          "bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800 ring-1 ring-blue-200 dark:ring-blue-800",
                        isCompleted && "opacity-75 bg-zinc-50 dark:bg-zinc-900",
                        !isActive && !isCompleted && "bg-white dark:bg-black",
                      )}
                      onClick={() => handleSetActiveTicket(t)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {isActive && (
                              <Play className="h-3 w-3 text-blue-500 fill-blue-500 animate-pulse" />
                            )}
                            {isCompleted && (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            )}
                            <span
                              className={cn(
                                "font-medium text-sm line-clamp-2",
                                isCompleted && "text-zinc-500 line-through",
                              )}
                            >
                              {t.title}
                            </span>
                          </div>
                          {t.score && (
                            <Badge
                              variant="secondary"
                              className="text-xs h-5 px-1.5"
                            >
                              Score: {t.score}
                            </Badge>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {isCompleted ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-zinc-400 hover:text-blue-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTicket({
                                    id: t.id,
                                    title: t.title,
                                    score: t.score || "",
                                  });
                                }}
                                title="Edit Score"
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-zinc-400 hover:text-orange-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRevote(t);
                                }}
                                title="Revote"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-zinc-400 hover:text-blue-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingTicket({ id: t.id, title: t.title });
                              }}
                              title="Rename"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-zinc-400 hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTicket(t.id);
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </Card>

          {/* PLAYERS LIST (Sidebar) */}
          <Card className="border-none shadow-none bg-transparent">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500">
              <Users className="h-4 w-4" /> Players ({players.length})
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 text-xs font-bold">
                        {p.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        p.id === playerId && "text-blue-600",
                      )}
                    >
                      {p.name} {p.id === playerId && "(You)"}
                    </span>
                  </div>
                  {p.vote && !roomState?.is_revealed && (
                    <span className="h-2 w-2 rounded-full bg-green-500 block animate-pulse" />
                  )}
                  {p.vote && roomState?.is_revealed && (
                    <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
                      {p.vote}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Room Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Card Deck (CSV)</label>
              <Input
                value={tempDeck}
                onChange={(e) => setTempDeck(e.target.value)}
                placeholder="0, 1, 2, 3, 5, 8, 13, ..."
              />
              <p className="text-xs text-zinc-500">
                Comma separated values. E.g: 1, 2, 3, 5, 8
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSettings}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Score Dialog */}
      <Dialog
        open={!!editingTicket}
        onOpenChange={(open) => !open && setEditingTicket(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Score: {editingTicket?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={editingTicket?.score || ""}
              onChange={(e) =>
                setEditingTicket((prev) =>
                  prev ? { ...prev, score: e.target.value } : null,
                )
              }
              placeholder="Enter new score"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingTicket(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTicketScore}>Update Score</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Ticket Dialog */}
      <Dialog
        open={!!renamingTicket}
        onOpenChange={(open) => !open && setRenamingTicket(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Agenda Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={renamingTicket?.title || ""}
              onChange={(e) =>
                setRenamingTicket((prev) =>
                  prev ? { ...prev, title: e.target.value } : null,
                )
              }
              placeholder="Enter new title"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameTicket();
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRenamingTicket(null)}>
                Cancel
              </Button>
              <Button onClick={handleRenameTicket}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
