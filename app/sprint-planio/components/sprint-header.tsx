"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowLeft,
  RefreshCw,
  Copy,
  Check,
  Settings,
  Link as LinkIcon,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ModeToggle } from "@/components/mode-toggle";
import { toast } from "sonner";
import { useSprintStore } from "../store";

const deckSchema = z.object({
  deckString: z.string().min(1, "Deck cannot be empty"),
});

type DeckFormData = z.infer<typeof deckSchema>;

interface SprintHeaderProps {
  onSaveSettings: (newDeck: string[]) => void;
  onReset: () => void;
}

export function SprintHeader({ onSaveSettings, onReset }: SprintHeaderProps) {
  const { roomId, deck } = useSprintStore();
  const [showSettings, setShowSettings] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DeckFormData>({
    resolver: zodResolver(deckSchema),
    defaultValues: {
      deckString: "",
    },
  });

  useEffect(() => {
    if (showSettings) {
      setValue("deckString", deck.join(", "));
    }
  }, [showSettings, deck, setValue]);

  const onSubmit = (data: DeckFormData) => {
    const cleanDeck = data.deckString
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
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setIsCopied(true);
      toast.success("Room ID copied!");
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const copyRoomLink = () => {
    if (typeof window !== "undefined") {
      const url = window.location.origin + window.location.pathname;
      navigator.clipboard.writeText(url);
      setIsLinkCopied(true);
      toast.success("Room Link copied!");
      setTimeout(() => setIsLinkCopied(false), 2000);
    }
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
              Room:{" "}
              <span className="font-mono">
                {roomId ? `${roomId.slice(0, 8)}...` : "..."}
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={copyRoomLink}
            title="Copy Room Link"
          >
            {isLinkCopied ? (
              <Check className="h-5 w-5" />
            ) : (
              <LinkIcon className="h-5 w-5" />
            )}
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
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            title="Logout"
            className="text-zinc-500 hover:text-red-500"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Room Settings</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Card Deck Values (comma separated)
              </label>
              <Input
                {...register("deckString")}
                placeholder="e.g. 1, 2, 3, 5, 8, 13"
              />
              {errors.deckString && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.deckString.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
