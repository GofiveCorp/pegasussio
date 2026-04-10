"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  List,
  Plus,
  X,
  Edit3,
  RotateCcw,
  Pencil,
  Trash2,
  Send,
  CloudDownload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useSprintStore } from "../store";
import { useJira } from "../hooks/use-jira";
import { JiraImportDialog } from "./jira-import-dialog";

interface TicketFormData {
  title: string;
}

export function TicketsPanel() {
  const tickets = useSprintStore((s) => s.tickets);
  const players = useSprintStore((s) => s.players);
  const roomState = useSprintStore((s) => s.roomState);
  const playerId = useSprintStore((s) => s.playerId);

  const isLeader = useMemo(
    () => players.find((p) => p.id === playerId)?.is_leader || false,
    [players, playerId],
  );

  const store = useSprintStore.getState;
  const { postScoreToJira } = useJira();

  const [showAddTicket, setShowAddTicket] = useState(false);
  const [showJiraImport, setShowJiraImport] = useState(false);
  const { register, handleSubmit, reset, setFocus } = useForm<TicketFormData>();

  const [editingTicket, setEditingTicket] = useState<{
    id: string;
    title: string;
    score: string;
  } | null>(null);
  const [renamingTicket, setRenamingTicket] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const onSubmit = (data: TicketFormData) => {
    if (data.title.trim()) {
      store().addTicket(data.title.trim());
      reset();
      setShowAddTicket(false);
    }
  };

  const handleUpdateScore = () => {
    if (editingTicket) {
      store().updateTicketScore(editingTicket.id, editingTicket.score);
      setEditingTicket(null);
    }
  };

  const handleRename = () => {
    if (renamingTicket && renamingTicket.title.trim()) {
      store().renameTicket(renamingTicket.id, renamingTicket.title);
      setRenamingTicket(null);
    }
  };

  const handlePostScoreToJira = (ticket: typeof tickets[0]) => {
    const match = ticket.title.match(/^([A-Z]+-\d+):/);
    if (!match || !ticket.score) return;
    postScoreToJira(match[1], ticket.score);
  };

  return (
    <>
      <Card className="flex-1 flex flex-col border-none shadow-none bg-transparent">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500">
            <List className="h-4 w-4" /> Agenda
          </h3>
          <div className="flex items-center gap-1">
            {isLeader && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowJiraImport(true)}
                  className="h-6 w-6"
                  title="Import from Jira"
                >
                  <CloudDownload className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowAddTicket(!showAddTicket);
                    if (!showAddTicket) setTimeout(() => setFocus("title"), 0);
                  }}
                  className="h-6 w-6"
                >
                  {showAddTicket ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {showAddTicket && (
          <Card className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-900 border-dashed">
            <form onSubmit={handleSubmit(onSubmit)}>
              <Input
                {...register("title", { required: true })}
                placeholder="Enter ticket title..."
                className="mb-2 bg-white dark:bg-black"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowAddTicket(false);
                }}
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => setShowAddTicket(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Add
                </Button>
              </div>
            </form>
          </Card>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 max-h-[500px] pr-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
          {tickets.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 text-sm italic">
              No agenda items yet
            </div>
          ) : (
            tickets.map((ticket) => {
              const isActive = roomState?.active_ticket_id === ticket.id;
              const isCompleted = ticket.status === "completed";

              return (
                <div
                  key={ticket.id}
                  onClick={() => isLeader && store().setActiveTicket(ticket)}
                  className={cn(
                    "group relative p-3 rounded-lg border transition-all hover:shadow-sm",
                    isLeader && "cursor-pointer",
                    isActive
                      ? "bg-white dark:bg-zinc-900 border-blue-500 shadow-md ring-1 ring-blue-500/20"
                      : isCompleted
                        ? "bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isActive && (
                          <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        )}
                        <h4
                          className={cn(
                            "font-medium truncate text-sm",
                            isActive
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-zinc-700 dark:text-zinc-300",
                          )}
                          title={ticket.title}
                        >
                          {ticket.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] h-5 px-1.5 font-normal",
                            isActive
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              : isCompleted
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
                          )}
                        >
                          {isActive && !isCompleted
                            ? "Voting Now"
                            : isCompleted
                              ? `Score: ${ticket.score || "-"}`
                              : "Pending"}
                        </Badge>
                      </div>
                    </div>

                    {isLeader && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isCompleted && (
                          <>
                            {ticket.title.match(/^[A-Z]+-\d+:/) && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePostScoreToJira(ticket);
                                }}
                                title="Post Score to Jira"
                              >
                                <Send className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                store().revote(ticket);
                              }}
                              title="Revote"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTicket({
                                  id: ticket.id,
                                  title: ticket.title,
                                  score: ticket.score || "",
                                });
                              }}
                              title="Edit Score"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          </>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-zinc-400 hover:text-blue-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingTicket({
                              id: ticket.id,
                              title: ticket.title,
                            });
                          }}
                          title="Rename"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            store().deleteTicket(ticket.id);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
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
          <div className="py-4">
            <Input
              value={editingTicket?.score || ""}
              onChange={(e) =>
                setEditingTicket((prev) =>
                  prev ? { ...prev, score: e.target.value } : null,
                )
              }
              placeholder="Enter score..."
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditingTicket(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateScore}>Save Score</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog
        open={!!renamingTicket}
        onOpenChange={(open) => !open && setRenamingTicket(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Agenda</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renamingTicket?.title || ""}
              onChange={(e) =>
                setRenamingTicket((prev) =>
                  prev ? { ...prev, title: e.target.value } : null,
                )
              }
              placeholder="Enter title..."
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRenamingTicket(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Rename</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Jira Import Dialog */}
      <JiraImportDialog
        open={showJiraImport}
        onOpenChange={setShowJiraImport}
        onImport={(issues) => {
          issues.forEach((issue) => {
            store().addTicket(`${issue.key}: ${issue.summary}`);
          });
        }}
      />
    </>
  );
}
