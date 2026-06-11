import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { Player, Room, Ticket, VoteSnapshot } from "./types";
import { getClientId } from "./client-id";
import { toast } from "sonner";

export const DEFAULT_DECK = ["1", "2", "3", "5"];

// Tracks the auto-advance timeout so it can be cancelled
// if the leader manually selects a ticket during the delay.
let autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;

interface SprintState {
  // State
  roomId: string | null;
  playerId: string | null;
  players: Player[];
  tickets: Ticket[];
  roomState: Room | null;
  deck: string[];
  selectedVote: string | null;

  // Initialization
  initialize: (data: {
    roomId: string;
    room: Room;
    players: Player[];
    tickets: Ticket[];
  }) => void;
  setPlayerId: (id: string | null) => void;

  // Realtime dispatchers (pure state updates)
  onRoomUpdate: (room: Room) => void;
  onPlayerInsert: (player: Player) => void;
  onPlayerUpdate: (player: Player) => void;
  onPlayerDelete: (deletedId: string) => void;
  onTicketInsert: (ticket: Ticket) => void;
  onTicketUpdate: (ticket: Ticket) => void;
  onTicketDelete: (deletedId: string) => void;

  // Game actions (async, call Supabase)
  createPlayer: (name: string, opts?: { isLeader?: boolean }) => Promise<void>;
  resolvePlayerByClient: () => Promise<Player | null>;
  selectVote: (value: string) => Promise<void>;
  revealCards: () => Promise<void>;
  resetVotes: () => Promise<void>;
  saveScore: (score: string) => Promise<void>;
  setActiveTicket: (ticket: Ticket, skipAutoSave?: boolean) => Promise<void>;
  addTicket: (title: string) => Promise<void>;
  renameTicket: (id: string, newTitle: string) => Promise<void>;
  deleteTicket: (ticketId: string) => Promise<void>;
  revote: (ticket: Ticket) => Promise<void>;
  updateTicketScore: (id: string, score: string) => Promise<void>;
  saveDeckSettings: (newDeck: string[]) => Promise<void>;
  transferLeadership: (targetPlayerId: string) => Promise<void>;
  kickPlayer: (targetPlayerId: string) => Promise<void>;
}

export const useSprintStore = create<SprintState>((set, get) => ({
  roomId: null,
  playerId: null,
  players: [],
  tickets: [],
  roomState: null,
  deck: DEFAULT_DECK,
  selectedVote: null,

  // --- Initialization ---

  initialize: ({ roomId, room, players, tickets }) => {
    set({
      roomId,
      roomState: room,
      players,
      tickets,
      deck: room.card_deck ?? DEFAULT_DECK,
      selectedVote: null,
    });
  },

  setPlayerId: (id) => set({ playerId: id }),

  // --- Realtime dispatchers (pure state, no async) ---

  onRoomUpdate: (room) => {
    set((state) => ({
      roomState: room,
      deck:
        room.card_deck &&
        JSON.stringify(room.card_deck) !== JSON.stringify(state.deck)
          ? room.card_deck
          : state.deck,
    }));
  },

  onPlayerInsert: (player) => {
    set((state) => ({
      players: state.players.some((p) => p.id === player.id)
        ? state.players
        : [...state.players, player],
    }));
  },

  onPlayerUpdate: (player) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === player.id ? player : p,
      ),
    }));
  },

  onPlayerDelete: (deletedId) => {
    set((state) => ({
      players: state.players.filter((p) => p.id !== deletedId),
    }));
  },

  onTicketInsert: (ticket) => {
    set((state) => ({
      tickets: [...state.tickets, ticket],
    }));
  },

  onTicketUpdate: (ticket) => {
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticket.id ? ticket : t,
      ),
    }));
  },

  onTicketDelete: (deletedId) => {
    set((state) => ({
      tickets: state.tickets.filter((t) => t.id !== deletedId),
    }));
  },

  // --- Game actions ---

  createPlayer: async (name, opts) => {
    const { roomId } = get();
    if (!roomId) return;

    const clientId = getClientId();

    // Caller can preset leadership (e.g. self-heal after a stale leave preserves
    // it); otherwise the first player into the room becomes leader.
    let isLeader = opts?.isLeader;
    if (isLeader === undefined) {
      const { count } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true })
        .eq("room_id", roomId);
      isLeader = count === 0;
    }

    const { data: playerData, error } = await supabase
      .from("players")
      .insert([{ room_id: roomId, name, is_leader: isLeader, client_id: clientId }])
      .select()
      .single();

    if (error) {
      // Unique violation: another tab for this browser raced us to the insert.
      // Resolve to the row that won instead of creating a duplicate.
      if (error.code === "23505") {
        await get().resolvePlayerByClient();
        return;
      }
      console.error(error);
      toast.error("Failed to join room");
      return;
    }

    if (playerData) {
      set((state) => ({
        playerId: playerData.id,
        players: state.players.some((p) => p.id === playerData.id)
          ? state.players
          : [...state.players, playerData],
      }));
    }
  },

  resolvePlayerByClient: async () => {
    const { roomId } = get();
    if (!roomId) return null;

    const clientId = getClientId();
    const { data: existing } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomId)
      .eq("client_id", clientId)
      .maybeSingle();

    if (!existing) return null;

    set((state) => ({
      playerId: existing.id,
      players: state.players.some((p) => p.id === existing.id)
        ? state.players.map((p) => (p.id === existing.id ? existing : p))
        : [...state.players, existing],
    }));
    return existing as Player;
  },

  selectVote: async (value) => {
    const { playerId, selectedVote, roomState } = get();
    if (!playerId) return;

    const activeTicket = get().tickets.find(
      (t) => t.id === roomState?.active_ticket_id,
    );
    if (activeTicket?.status === "completed" || roomState?.is_revealed) return;

    const newVote = selectedVote === value ? null : value;
    set({ selectedVote: newVote });

    await supabase
      .from("players")
      .update({ vote: newVote })
      .eq("id", playerId);
  },

  revealCards: async () => {
    const { roomId, players, roomState } = get();
    if (!roomId || !roomState?.active_ticket_id) return;

    await supabase
      .from("rooms")
      .update({ is_revealed: true })
      .eq("id", roomId);

    // Calculate average and auto-save
    const numericVotes = players
      .map((p) => parseFloat(p.vote || "0"))
      .filter((v) => !isNaN(v) && v > 0);

    if (numericVotes.length > 0) {
      const avg = (
        numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length
      ).toFixed(1);
      await get().saveScore(avg);
    }
  },

  resetVotes: async () => {
    const { roomId } = get();
    if (!roomId) return;

    set({ selectedVote: null });
    await supabase
      .from("rooms")
      .update({ is_revealed: false })
      .eq("id", roomId);
    await supabase
      .from("players")
      .update({ vote: null })
      .eq("room_id", roomId);
  },

  saveScore: async (scoreToSave) => {
    const { roomState, players, tickets } = get();
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
      return;
    }

    toast.success("Score saved!");

    // Auto-advance to next pending ticket
    const currentIndex = tickets.findIndex(
      (t) => t.id === roomState.active_ticket_id,
    );
    if (currentIndex === -1) return;

    let nextTicket: Ticket | undefined;

    // Search forward
    for (let i = currentIndex + 1; i < tickets.length; i++) {
      if (tickets[i].status !== "completed" && !tickets[i].score) {
        nextTicket = tickets[i];
        break;
      }
    }

    // Wrap around
    if (!nextTicket) {
      for (let i = 0; i < currentIndex; i++) {
        if (tickets[i].status !== "completed" && !tickets[i].score) {
          nextTicket = tickets[i];
          break;
        }
      }
    }

    if (nextTicket) {
      // Cancel any previously scheduled auto-advance
      if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = setTimeout(() => {
        autoAdvanceTimer = null;
        get().setActiveTicket(nextTicket!, true);
      }, 300);
    }
  },

  setActiveTicket: async (ticket, skipAutoSave = false) => {
    const { roomId, roomState, players } = get();
    if (!roomId) return;

    // Cancel any pending auto-advance so it doesn't overwrite an explicit selection
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }

    // Auto-save current if revealed and switching
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
        await get().saveScore(avg);

        // saveScore schedules an auto-advance timer. Cancel it since the
        // leader is explicitly choosing which ticket to switch to.
        if (autoAdvanceTimer) {
          clearTimeout(autoAdvanceTimer);
          autoAdvanceTimer = null;
        }
      }
    }

    set({ selectedVote: null });

    const isCompleted = ticket.status === "completed";
    const updates: Record<string, unknown> = { active_ticket_id: ticket.id };
    if (!isCompleted) updates.is_revealed = false;

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
  },

  addTicket: async (title) => {
    const { roomId } = get();
    if (!roomId) return;

    const { error } = await supabase
      .from("tickets")
      .insert([{ room_id: roomId, title, status: "pending" }]);

    if (error) toast.error("Failed to add ticket");
  },

  renameTicket: async (id, newTitle) => {
    const { error } = await supabase
      .from("tickets")
      .update({ title: newTitle })
      .eq("id", id);

    if (error) toast.error("Failed to rename ticket");
  },

  deleteTicket: async (ticketId) => {
    const { roomId, roomState } = get();
    if (!roomId) return;

    if (roomState?.active_ticket_id === ticketId) {
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
  },

  revote: async (ticket) => {
    const { roomId } = get();
    if (!roomId) return;

    await supabase
      .from("rooms")
      .update({ active_ticket_id: ticket.id, is_revealed: false })
      .eq("id", roomId);
    await supabase
      .from("tickets")
      .update({ status: "active", score: null, votes_snapshot: null })
      .eq("id", ticket.id);
    await supabase
      .from("players")
      .update({ vote: null })
      .eq("room_id", roomId);

    set({ selectedVote: null });
    toast.info(`Revoting on ${ticket.title}`);
  },

  updateTicketScore: async (id, score) => {
    const { error } = await supabase
      .from("tickets")
      .update({ score })
      .eq("id", id);

    if (error) toast.error("Failed to update score");
  },

  saveDeckSettings: async (newDeck) => {
    const { roomId } = get();
    if (!roomId) return;

    const { error } = await supabase
      .from("rooms")
      .update({ card_deck: newDeck })
      .eq("id", roomId);

    if (error) toast.error("Failed to update settings");
  },

  transferLeadership: async (targetPlayerId) => {
    const { playerId } = get();
    if (!playerId) return;

    // Optimistic update
    set((state) => ({
      players: state.players.map((p) => {
        if (p.id === playerId) return { ...p, is_leader: false };
        if (p.id === targetPlayerId) return { ...p, is_leader: true };
        return p;
      }),
    }));

    // Promote new leader first (safety: 2 leaders > 0 leaders on partial failure)
    const { error: promoteError } = await supabase
      .from("players")
      .update({ is_leader: true })
      .eq("id", targetPlayerId);

    if (promoteError) {
      toast.error("Failed to transfer leadership");
      return;
    }

    await supabase
      .from("players")
      .update({ is_leader: false })
      .eq("id", playerId);

    toast.success("Leadership transferred");
  },

  kickPlayer: async (targetPlayerId) => {
    // Mark as kicked before deleting so the DELETE's old row image carries
    // kicked_at — that's how the target distinguishes a real kick from an
    // ordinary leave/refresh and avoids a false "you were kicked" redirect.
    await supabase
      .from("players")
      .update({ kicked_at: new Date().toISOString() })
      .eq("id", targetPlayerId);

    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", targetPlayerId);

    if (error) {
      toast.error("Failed to kick player");
    } else {
      toast.success("Player kicked");
    }
  },
}));
