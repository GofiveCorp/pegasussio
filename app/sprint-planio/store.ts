import { create } from "zustand";
import { Player, Room, Ticket } from "./types";

interface SprintState {
  roomId: string | null;
  playerId: string | null;
  players: Player[];
  tickets: Ticket[];
  roomState: Room | null;
  deck: string[];
  selectedVote: string | null;

  // Actions
  setRoomId: (id: string) => void;
  setPlayerId: (id: string) => void;
  setPlayers: (players: Player[] | ((prev: Player[]) => Player[])) => void;
  setTickets: (tickets: Ticket[] | ((prev: Ticket[]) => Ticket[])) => void;
  setRoomState: (room: Room) => void;
  setDeck: (deck: string[]) => void;
  setSelectedVote: (vote: string | null) => void;

  // Derived helpers could be added here or kept in components,
  // but Zustand selectors are good for derived state.
}

export const DEFAULT_DECK = ["1", "2", "3", "5"];

export const useSprintStore = create<SprintState>((set) => ({
  roomId: null,
  playerId: null,
  players: [],
  tickets: [],
  roomState: null,
  deck: DEFAULT_DECK,
  selectedVote: null,

  setRoomId: (id) => set({ roomId: id }),
  setPlayerId: (id) => set({ playerId: id }),
  setPlayers: (players) =>
    set((state) => ({
      players: typeof players === "function" ? players(state.players) : players,
    })),
  setTickets: (tickets) =>
    set((state) => ({
      tickets: typeof tickets === "function" ? tickets(state.tickets) : tickets,
    })),
  setRoomState: (room) => set({ roomState: room }),
  setDeck: (deck) => set({ deck }),
  setSelectedVote: (vote) => set({ selectedVote: vote }),
}));
