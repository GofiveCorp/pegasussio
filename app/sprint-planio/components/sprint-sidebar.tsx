"use client";

import { useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
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
  Send,
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
import { Ticket } from "../types";
import { useSprintStore } from "../store";
import { JiraImportDialog } from "./jira-import-dialog";
import { CloudDownload } from "lucide-react";
import { toast } from "sonner";

interface SprintSidebarProps {
  onAddTicket: (title: string) => void;
  onDeleteTicket: (id: string) => void;
  onRenameTicket: (id: string, newTitle: string) => void;
  onSetActiveTicket: (ticket: Ticket) => void;
  onRevote: (ticket: Ticket) => void;
  onUpdateScore: (id: string, score: string) => void;
}

interface TicketFormData {
  title: string;
}

export function SprintSidebar({
  onAddTicket,
  onDeleteTicket,
  onRenameTicket,
  onSetActiveTicket,
  onRevote,
  onUpdateScore,
}: SprintSidebarProps) {
  const { tickets, players, roomState, playerId } = useSprintStore();
  const activeTicket = tickets.find(
    (t) => t.id === roomState?.active_ticket_id,
  );

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
      onAddTicket(data.title.trim());
      reset();
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

  const handlePostScoreToJira = async (ticket: Ticket) => {
    const match = ticket.title.match(/^([A-Z]+-\d+):/);
    if (!match) return;

    const issueKey = match[1];
    const score = ticket.score;

    if (!score) {
      toast.error("No score to post");
      return;
    }

    const authType = localStorage.getItem("jira_auth_type") || "basic";
    const payload: any = {
      issueKey,
      comment: `Sprint Poker Score: ${score}\n\nPowered by Sprint Planio 🚀`,
    };

    if (authType === "oauth") {
      payload.authType = "oauth";
      payload.accessToken = localStorage.getItem("jira_access_token");
      payload.cloudId = localStorage.getItem("jira_cloud_id");

      if (!payload.accessToken) {
        toast.error(
          "Missing Jira OAuth token. Please reconnect in Import dialog.",
        );
        return;
      }
    } else {
      payload.authType = "basic";
      payload.domain = localStorage.getItem("jira_domain");
      payload.email = localStorage.getItem("jira_email");
      payload.token = localStorage.getItem("jira_token");

      if (!payload.domain || !payload.email || !payload.token) {
        toast.error(
          "Missing Jira credentials. Please open Import dialog to save them.",
        );
        return;
      }
    }

    const toastId = toast.loading("Posting score to Jira...");

    try {
      await axios.post("/api/jira/comment", payload);
      toast.success("Score posted to Jira!", { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Failed to post score", {
        id: toastId,
      });
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
          <div className="flex items-center gap-1">
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
                  onClick={() => onSetActiveTicket(ticket)}
                  className={cn(
                    "group relative p-3 rounded-lg border transition-all hover:shadow-sm cursor-pointer",
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
                          {isActive
                            ? "Voting Now"
                            : isCompleted
                              ? `Score: ${ticket.score || "-"}`
                              : "Pending"}
                        </Badge>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isCompleted && (
                        <>
                          {/* Check for Jira Key pattern */}
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
                              onRevote(ticket);
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
                          onDeleteTicket(ticket.id);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* PLAYERS SECTION */}
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
                </div>
                {p.vote ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Modals */}
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

      <JiraImportDialog
        open={showJiraImport}
        onOpenChange={setShowJiraImport}
        onImport={(issues) => {
          issues.forEach((issue) => {
            onAddTicket(`${issue.key}: ${issue.summary}`);
          });
        }}
      />
    </div>
  );
}
