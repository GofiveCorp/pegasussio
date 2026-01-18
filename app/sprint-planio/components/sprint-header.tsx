"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Copy, Check, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModeToggle } from "@/components/mode-toggle";
import { toast } from "sonner";

interface SprintHeaderProps {
  roomId: string;
  deck: string[];
  onSaveSettings: (newDeck: string[]) => void;
  onReset: () => void;
}

export function SprintHeader({
  roomId,
  deck,
  onSaveSettings,
  onReset,
}: SprintHeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [tempDeck, setTempDeck] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const handleSave = () => {
    const cleanDeck = tempDeck
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (cleanDeck.length === 0) {
      toast.error("Deck cannot be empty");
      return;
    }

    onSaveSettings(cleanDeck);
    setShowSettings(false);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setIsCopied(true);
    toast.success("Room ID copied!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <>
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
            onClick={onReset}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </header>

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
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
