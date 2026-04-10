import { supabase } from "@/lib/supabase";
import { DEFAULT_DECK } from "../store";
import { GameProvider } from "../components/game-provider";
import { GameHeader } from "../components/game-header";
import { VotingArea } from "../components/voting-area";
import { TicketsPanel } from "../components/tickets-panel";
import { PlayersPanel } from "../components/players-panel";
import { Room, Player, Ticket } from "../types";

interface PageProps {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SprintPlanioPage({
  params,
  searchParams,
}: PageProps) {
  const { roomId } = await params;
  const search = await searchParams;
  const playerName =
    typeof search.name === "string" ? search.name : "Anonymous";

  // 1. Fetch or Create Room
  let roomState: Room | null = null;
  let { data: roomData, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (roomError || !roomData) {
    const { error: createError } = await supabase
      .from("rooms")
      .insert([{ id: roomId, status: "active", card_deck: DEFAULT_DECK }]);

    if (!createError) {
      roomState = {
        id: roomId,
        status: "active",
        card_deck: DEFAULT_DECK,
        is_revealed: false,
      } as Room;
    } else {
      // Race condition fallback
      const { data: retryData } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();
      if (retryData) roomState = retryData;
    }
  } else {
    roomState = roomData;
  }

  // 2. Fetch Initial Data
  const [pUsers, pTickets] = await Promise.all([
    supabase.from("players").select("*").eq("room_id", roomId),
    supabase
      .from("tickets")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true }),
  ]);

  const initialPlayers = (pUsers.data as Player[]) || [];
  const initialTickets = (pTickets.data as Ticket[]) || [];

  if (!roomState) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold text-red-500">Failed to load room</h1>
        <p className="text-zinc-500">Could not create or join room: {roomId}</p>
        <a
          href="/sprint-planio"
          className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors"
        >
          Return to Lobby
        </a>
      </div>
    );
  }

  return (
    <GameProvider
      roomId={roomId}
      initialRoomState={roomState}
      initialPlayers={initialPlayers}
      initialTickets={initialTickets}
      initialPlayerName={playerName}
    >
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col">
        <GameHeader />
        <main className="flex-1 flex flex-col lg:flex-row p-6 gap-8 max-w-7xl mx-auto w-full">
          <VotingArea />
          <div className="w-full lg:w-80 flex flex-col gap-8 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 pt-8 lg:pt-0 lg:pl-8">
            <TicketsPanel />
            <PlayersPanel />
          </div>
        </main>
      </div>
    </GameProvider>
  );
}
