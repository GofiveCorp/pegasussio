import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.JIRA_CLIENT_ID;
  const redirectUri =
    process.env.JIRA_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/jira/oauth/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "Missing JIRA_CLIENT_ID configuration" },
      { status: 500 },
    );
  }

  // Scopes required for 3LO
  // read:jira-work - to search issues
  // write:jira-work - to post comments
  // offline_access - (optional) to get refresh token if we wanted to persist long term,
  // but for now we just want access_token for the session. Added for good measure.
  const scopes = "read:jira-work write:jira-work offline_access";

  const authUrl = new URL("https://auth.atlassian.com/authorize");
  authUrl.searchParams.append("audience", "api.atlassian.com");
  authUrl.searchParams.append("client_id", clientId);
  authUrl.searchParams.append("scope", scopes);
  authUrl.searchParams.append("redirect_uri", redirectUri);
  authUrl.searchParams.append("state", crypto.randomUUID()); // Simple state for now
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("prompt", "consent");

  return NextResponse.redirect(authUrl.toString());
}
