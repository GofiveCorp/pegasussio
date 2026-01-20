"use client";

import { useState, useEffect } from "react";
import { Octokit } from "octokit";
import { toast } from "sonner";
import {
  Check,
  FileCode,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageCircle,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

interface PRModalProps {
  pr: any;
  token: string;
  onClose: () => void;
  onApprove: () => void;
}

interface PRFile {
  sha: string | null;
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch?: string;
}

interface Comment {
  id: number;
  user: {
    login: string;
    avatar_url: string;
  };
  body: string;
  created_at: string;
}

export function PRModal({ pr, token, onClose, onApprove }: PRModalProps) {
  const [files, setFiles] = useState<PRFile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewBody, setReviewBody] = useState("LGTM");
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (pr && token) {
      const controller = new AbortController();
      fetchFiles(controller.signal);
      fetchComments(controller.signal);

      return () => {
        controller.abort();
      };
    }
  }, [pr, token]);

  const fetchFiles = async (signal?: AbortSignal) => {
    setLoadingFiles(true);
    try {
      const octokit = new Octokit({ auth: token, request: { signal } });
      const [owner, repo] = pr.base.repo.full_name.split("/");
      const { data } = await octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: pr.number,
      });
      setFiles(data);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Failed to fetch files:", error);
      }
    } finally {
      if (!signal?.aborted) {
        setLoadingFiles(false);
      }
    }
  };

  const fetchComments = async (signal?: AbortSignal) => {
    try {
      const octokit = new Octokit({ auth: token, request: { signal } });
      const [owner, repo] = pr.base.repo.full_name.split("/");
      const { data } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: pr.number,
      });
      setComments(data as Comment[]);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Failed to fetch comments:", error);
      }
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const octokit = new Octokit({ auth: token });
      const [owner, repo] = pr.base.repo.full_name.split("/");
      await octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number: pr.number,
        body: reviewBody,
        event: "APPROVE",
      });
      toast.success("PR approved successfully!");
      onApprove();
      onClose();
    } catch (error) {
      console.error("Failed to approve PR:", error);
      toast.error("Failed to approve PR. Check permissions.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFile = (filename: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    setExpandedFiles(newExpanded);
  };

  const isHtml = (text: string) => {
    const htmlRegex = /<[a-z][\s\S]*>/i;
    return htmlRegex.test(text);
  };

  return (
    <Dialog open={!!pr} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <DialogTitle className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="line-clamp-1 mr-4">{pr.title}</span>
              <div className="flex items-center flex-wrap gap-2 text-sm font-normal text-zinc-500">
                <span>
                  #{pr.number} in {pr.base.repo.full_name} by {pr.user.login}
                </span>
                <Badge variant="outline" className="font-mono text-xs">
                  {pr.head.ref}
                </Badge>
                <span className="text-xs">→</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {pr.base.ref}
                </Badge>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="prose dark:prose-invert max-w-none text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
            {pr.body || "No description provided."}
          </div>

          {comments.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <MessageCircle className="h-4 w-4" /> Comments (
                {comments.length})
              </h3>
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800"
                  >
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarImage src={comment.user.avatar_url} />
                      <AvatarFallback>
                        {comment.user.login.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                          {comment.user.login}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {isHtml(comment.body) ? (
                        <div
                          className="text-sm text-zinc-600 dark:text-zinc-300 prose dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                          dangerouslySetInnerHTML={{ __html: comment.body }}
                        />
                      ) : (
                        <div className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap break-words">
                          {comment.body}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileCode className="h-4 w-4" /> Changed Files ({files.length})
            </h3>

            {loadingFiles ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.filename}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleFile(file.filename)}
                      className="w-full flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 font-mono text-sm text-zinc-700 dark:text-zinc-300">
                        {expandedFiles.has(file.filename) ? (
                          <ChevronDown className="h-4 w-4 text-zinc-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-zinc-400" />
                        )}
                        <span className="break-all">{file.filename}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-green-600">
                          +{file.additions}
                        </span>
                        <span className="text-red-600">-{file.deletions}</span>
                      </div>
                    </button>

                    {expandedFiles.has(file.filename) && (
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-950 overflow-x-auto">
                        <pre className="text-xs font-mono text-zinc-600 dark:text-zinc-400 whitespace-pre">
                          {file.patch ? (
                            <div className="flex flex-col">
                              {file.patch.split("\n").map((line, i) => {
                                let bgClass = "";
                                let textClass =
                                  "text-zinc-600 dark:text-zinc-400";
                                if (line.startsWith("+")) {
                                  bgClass =
                                    "bg-green-500/10 dark:bg-green-500/20";
                                  textClass =
                                    "text-green-700 dark:text-green-300";
                                } else if (line.startsWith("-")) {
                                  bgClass = "bg-red-500/10 dark:bg-red-500/20";
                                  textClass = "text-red-700 dark:text-red-300";
                                } else if (line.startsWith("@@")) {
                                  textClass =
                                    "text-blue-500/70 dark:text-blue-400/70";
                                }
                                return (
                                  <div key={i} className={`${bgClass} w-full`}>
                                    <span className="inline-block select-none w-6 text-right mr-2 opacity-30 text-[10px]"></span>
                                    <span className={textClass}>{line}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            "No changes to display (binary file or large diff)."
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col sm:flex-row gap-4 items-end sm:items-center">
          <div className="flex-1 w-full">
            <label className="text-xs font-medium text-zinc-500 mb-1 block">
              Review Comment
            </label>
            <textarea
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              className="w-full h-20 sm:h-auto sm:rows-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Leave a comment (optional)..."
            />
          </div>
          <Button
            onClick={handleApprove}
            disabled={submitting}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Approve PR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
