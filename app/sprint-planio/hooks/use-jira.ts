"use client";

import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useSprintStore } from "../store";

/**
 * Encapsulates Jira OAuth operations.
 * No tokens stored client-side — cookie-based auth.
 */
export function useJira() {
  const playerId = useSprintStore((s) => s.playerId);
  const [isConnected, setIsConnected] = useState(false);
  const [siteName, setSiteName] = useState("");

  // Check connection on mount by looking for the cookie
  useEffect(() => {
    // httpOnly cookies aren't readable from JS, so we ping a lightweight endpoint
    // or just track connection state from the OAuth flow
    const savedSiteName = sessionStorage.getItem("jira_site_name");
    if (savedSiteName) {
      setIsConnected(true);
      setSiteName(savedSiteName);
    }
  }, []);

  const connect = useCallback(() => {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      `/api/jira/oauth/login?playerId=${playerId}`,
      "Jira OAuth",
      `width=${width},height=${height},left=${left},top=${top}`,
    );

    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const { type, siteName: name } = event.data;
      if (type === "JIRA_OAUTH_SUCCESS") {
        setIsConnected(true);
        setSiteName(name || "Jira Cloud");
        sessionStorage.setItem("jira_site_name", name || "Jira Cloud");
        toast.success(`Connected to ${name || "Jira Cloud"}`);

        if (popup) popup.close();
        window.removeEventListener("message", messageHandler);
      }
    };

    window.addEventListener("message", messageHandler);
  }, [playerId]);

  const postScoreToJira = useCallback(async (issueKey: string, score: string) => {
    if (!score) {
      toast.error("No score to post");
      return;
    }

    const toastId = toast.loading("Updating Jira issue...");

    try {
      await axios.post("/api/jira/update-issue", { issueKey, score });
      toast.success("Jira issue updated!", { id: toastId });
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 401) {
        setIsConnected(false);
        sessionStorage.removeItem("jira_site_name");
        toast.error("Session expired. Please reconnect.", { id: toastId });
      } else {
        toast.error(
          error.response?.data?.error || "Failed to update issue",
          { id: toastId },
        );
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setSiteName("");
    sessionStorage.removeItem("jira_site_name");
  }, []);

  return { isConnected, siteName, connect, postScoreToJira, disconnect };
}
