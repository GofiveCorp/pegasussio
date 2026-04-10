import axios from "axios";
import { createServerSupabase } from "./supabase-server";

export class JiraAuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
  ) {
    super(message);
    this.name = "JiraAuthError";
  }
}

interface JiraAuth {
  accessToken: string;
  cloudId: string;
}

/**
 * Server-side helper to get valid Jira credentials from a session ID.
 * Auto-refreshes expired tokens.
 */
export async function getJiraAuth(jiraSessionId: string): Promise<JiraAuth> {
  const supabase = createServerSupabase();

  const { data: session, error } = await supabase
    .from("jira_sessions")
    .select("*")
    .eq("id", jiraSessionId)
    .single();

  if (error || !session) {
    throw new JiraAuthError("Jira session not found. Please reconnect.", 401);
  }

  const expiresAt = new Date(session.expires_at);
  const now = new Date();
  const bufferMs = 60 * 1000; // Refresh if within 60 seconds of expiry

  if (expiresAt.getTime() - now.getTime() < bufferMs) {
    // Token expired or about to expire — refresh
    if (!session.refresh_token) {
      throw new JiraAuthError(
        "Session expired and no refresh token available. Please reconnect.",
        401,
      );
    }

    try {
      const tokenResponse = await axios.post(
        "https://auth.atlassian.com/oauth/token",
        {
          grant_type: "refresh_token",
          client_id: process.env.JIRA_CLIENT_ID,
          client_secret: process.env.JIRA_CLIENT_SECRET,
          refresh_token: session.refresh_token,
        },
      );

      const {
        access_token,
        refresh_token: newRefreshToken,
        expires_in,
      } = tokenResponse.data;

      const newExpiresAt = new Date(
        Date.now() + expires_in * 1000,
      ).toISOString();

      // Update atomically
      await supabase
        .from("jira_sessions")
        .update({
          access_token,
          refresh_token: newRefreshToken || session.refresh_token,
          expires_at: newExpiresAt,
        })
        .eq("id", jiraSessionId);

      return { accessToken: access_token, cloudId: session.cloud_id };
    } catch (refreshError: any) {
      console.error(
        "Token refresh failed:",
        refreshError.response?.data || refreshError.message,
      );
      // Delete stale session
      await supabase
        .from("jira_sessions")
        .delete()
        .eq("id", jiraSessionId);
      throw new JiraAuthError(
        "Failed to refresh Jira session. Please reconnect.",
        401,
      );
    }
  }

  return { accessToken: session.access_token, cloudId: session.cloud_id };
}
