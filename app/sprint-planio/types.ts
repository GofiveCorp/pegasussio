export interface Player {
  id: string;
  name: string;
  vote: string | null;
  is_spectator: boolean;
  is_leader: boolean;
}

export interface Room {
  id: string;
  is_revealed: boolean;
  agenda_title?: string;
  card_deck?: string[];
  active_ticket_id?: string;
}

export interface VoteSnapshot {
  name: string;
  vote: string;
  id: string;
}

export interface Ticket {
  id: string;
  title: string;
  score: string | null;
  status: "pending" | "active" | "completed";
  votes_snapshot?: VoteSnapshot[];
}
