"use client";

import { useMemo, useState } from "react";
import {
  Users,
  X,
  CheckCircle,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useSprintStore } from "../store";

export function PlayersPanel() {
  const players = useSprintStore((s) => s.players);
  const playerId = useSprintStore((s) => s.playerId);

  const isLeader = useMemo(
    () => players.find((p) => p.id === playerId)?.is_leader || false,
    [players, playerId],
  );

  const store = useSprintStore.getState;

  const [transferTarget, setTransferTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [kickTarget, setKickTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <>
      <Card className="flex flex-col border-none shadow-none bg-transparent max-h-[300px]">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">
          <Users className="h-4 w-4" /> Players ({players.length})
        </h3>
        <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
          <div className="space-y-2">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800">
                    <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                      {p.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        p.id === playerId
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-zinc-700 dark:text-zinc-300",
                      )}
                    >
                      {p.name} {p.id === playerId && "(You)"}
                    </span>
                    {p.is_spectator && (
                      <span className="text-[10px] text-zinc-400">
                        Spectator
                      </span>
                    )}
                  </div>
                  {p.is_leader && (
                    <Crown className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                {p.vote ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                )}
                {isLeader && p.id !== playerId && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-[10px] h-6 px-2 text-zinc-400 hover:text-yellow-600"
                      onClick={() =>
                        setTransferTarget({ id: p.id, name: p.name })
                      }
                    >
                      Make Leader
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-zinc-400 hover:text-red-600 ml-1"
                      title="Kick Player"
                      onClick={() =>
                        setKickTarget({ id: p.id, name: p.name })
                      }
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Transfer Leadership Dialog */}
      <Dialog
        open={!!transferTarget}
        onOpenChange={(open) => !open && setTransferTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Leadership</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-zinc-600 dark:text-zinc-400">
            Are you sure you want to pass leadership to{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {transferTarget?.name}
            </span>
            ?
            <br />
            <span className="text-xs text-red-500 mt-2 block">
              You will lose administrative access to this room.
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTransferTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (transferTarget) {
                  store().transferLeadership(transferTarget.id);
                  setTransferTarget(null);
                }
              }}
            >
              Transfer Leadership
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kick Player Dialog */}
      <Dialog
        open={!!kickTarget}
        onOpenChange={(open) => !open && setKickTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kick Player</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-zinc-600 dark:text-zinc-400">
            Are you sure you want to kick{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {kickTarget?.name}
            </span>
            ?
            <br />
            <span className="text-xs text-red-500 mt-2 block">
              They will be removed from the room immediately.
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setKickTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (kickTarget) {
                  store().kickPlayer(kickTarget.id);
                  setKickTarget(null);
                }
              }}
            >
              Kick Player
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
