"use client";

import { useState } from "react";
import {
  Users,
  List,
  Plus,
  X,
  Play,
  CheckCircle,
  Edit3,
  RotateCcw,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Player, Ticket, Room } from "../types";

interface SprintSidebarProps {
  tickets: Ticket[];
  players: Player[];
  activeTicket?: Ticket;
  roomState: Room | null;
  playerId: string | null;
  onAddTicket: (title: string) => void;
  onDeleteTicket: (id: string) => void;
  onRenameTicket: (id: string, newTitle: string) => void;
  onSetActiveTicket: (ticket: Ticket) => void;
  onRevote: (ticket: Ticket) => void;
  onUpdateScore: (id: string, score: string) => void;
}

export function SprintSidebar({
  tickets,
  players,
  activeTicket,
  roomState,
  playerId,
  onAddTicket,
  onDeleteTicket,
  onRenameTicket,
  onSetActiveTicket,
  onRevote,
  onUpdateScore,
}: SprintSidebarProps) {
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [editingTicket, setEditingTicket] = useState<{
    id: string;
    title: string;
    score: string;
  } | null>(null);
  const [renamingTicket, setRenamingTicket] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const handleAdd = () => {
    if (newTicketTitle.trim()) {
      onAddTicket(newTicketTitle);
      setNewTicketTitle("");
      setShowAddTicket(false);
    }
  };

  const handleUpdateScore = () => {
    if (editingTicket) {
      onUpdateScore(editingTicket.id, editingTicket.score);
      setEditingTicket(null);
    }
  };

  const handleRename = () => {
    if (renamingTicket && renamingTicket.title.trim()) {
      onRenameTicket(renamingTicket.id, renamingTicket.title);
      setRenamingTicket(null);
    }
  };

  return (
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
                if (e.key === "Enter") handleAdd();
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
              <Button size="sm" onClick={handleAdd}>
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
                  onClick={() => onSetActiveTicket(t)}
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
                              onRevote(t);
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
                          onDeleteTicket(t.id);
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
              <Button onClick={handleUpdateScore}>Update Score</Button>
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
                if (e.key === "Enter") handleRename();
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRenamingTicket(null)}>
                Cancel
              </Button>
              <Button onClick={handleRename}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
