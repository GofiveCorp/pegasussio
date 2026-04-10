"use client";

import { useEffect, useRef, useState } from "react";
import { useRealtime } from "../hooks/use-realtime";
import { usePlayer } from "../hooks/use-player";
import { useSprintStore } from "../store";
import { Player, Room, Ticket } from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface GameProviderProps {
  roomId: string;
  initialRoomState: Room;
  initialPlayers: Player[];
  initialTickets: Ticket[];
  initialPlayerName: string;
  children: React.ReactNode;
}

export function GameProvider({
  roomId,
  initialRoomState,
  initialPlayers,
  initialTickets,
  initialPlayerName,
  children,
}: GameProviderProps) {
  const hasInitialized = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const playerId = useSprintStore((s) => s.playerId);

  // Initialize store with SSR data (once)
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    useSprintStore.getState().initialize({
      roomId,
      room: initialRoomState,
      players: initialPlayers,
      tickets: initialTickets,
    });
  }, [roomId, initialRoomState, initialPlayers, initialTickets]);

  // Subscribe to realtime events
  useRealtime(roomId);

  // Join as player
  const { needsNamePrompt } = usePlayer(roomId, initialPlayerName, initialPlayers);

  const [showNamePrompt, setShowNamePrompt] = useState(false);

  useEffect(() => {
    if (needsNamePrompt && !playerId) {
      setShowNamePrompt(true);
    }
  }, [needsNamePrompt, playerId]);

  // Hide prompt when player joins
  useEffect(() => {
    if (playerId) setShowNamePrompt(false);
  }, [playerId]);

  return (
    <>
      {children}

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
                  useSprintStore.getState().createPlayer(nameInputRef.current.value);
                }
              }}
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (nameInputRef.current?.value) {
                  useSprintStore.getState().createPlayer(nameInputRef.current.value);
                }
              }}
            >
              Join Room
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
