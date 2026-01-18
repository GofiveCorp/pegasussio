"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PokerCard } from "./poker-card";
import { Player } from "../types";
import { useSprintStore } from "../store";

interface SprintBoardProps {
  onSelect: (value: string) => void;
  onReveal: () => void;
  onSaveScore: (score: string) => void;
}

export function SprintBoard({
  onSelect,
  onReveal,
  onSaveScore,
}: SprintBoardProps) {
  const {
    players,
    tickets,
    roomState,
    playerId,
    selectedVote: selected,
    deck,
  } = useSprintStore();

  const activeTicket = tickets.find(
    (t) => t.id === roomState?.active_ticket_id,
  );

  const isViewOnly = activeTicket?.status === "completed";
  const revealed = isViewOnly ? true : roomState?.is_revealed;
  const [customScore, setCustomScore] = useState("");

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

  useEffect(() => {
    if (revealed && average && !isViewOnly) {
      setCustomScore(average);
    }
  }, [revealed, average, isViewOnly]);

  return (
    <div className="flex-1 flex flex-col items-center gap-8">
      {/* Banner: Active Ticket */}
      <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-4 px-6 text-center shadow-sm">
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

      <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[300px]">
        {/* Players Grid (or Snapshots) */}
        <div className="flex flex-wrap justify-center gap-6 animate-in fade-in zoom-in duration-300 mb-8">
          {displayPlayers.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-2 group">
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
            !Boolean(revealed) &&
            (Boolean(selected) || players.some((p) => p.vote)) && (
              <div className="animate-in fade-in slide-in-from-bottom-4 text-center">
                <Button
                  size="lg"
                  onClick={onReveal}
                  className="rounded-full shadow-lg gap-2 px-8"
                >
                  <Eye className="h-5 w-5" /> Reveal Cards
                </Button>
                <p className="text-xs mt-2 text-zinc-400">
                  {players.filter((p) => p.vote).length}/{players.length} voted
                </p>
              </div>
            )}

          {Boolean(revealed) &&
            (Boolean(displayAverage) || Boolean(average)) && (
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
                      onClick={() => onSaveScore(customScore || average || "")}
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
              onClick={() => onSelect(val)}
              className={cn(
                Boolean(revealed) &&
                  selected !== val &&
                  "opacity-25 grayscale cursor-not-allowed",
                Boolean(revealed) && selected === val && "ring-4 ring-blue-500",
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
  );
}
