import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

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

  const playerId = req.nextUrl.searchParams.get("playerId") || "";
  const state = crypto.randomUUID();

  // Store state + playerId in httpOnly cookie for CSRF validation
  const cookieStore = await cookies();
  cookieStore.set("jira_oauth_state", JSON.stringify({ state, playerId }), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 300, // 5 minutes
    path: "/",
  });

  const scopes = "read:jira-work write:jira-work offline_access";

  const authUrl = new URL("https://auth.atlassian.com/authorize");
  authUrl.searchParams.append("audience", "api.atlassian.com");
  authUrl.searchParams.append("client_id", clientId);
  authUrl.searchParams.append("scope", scopes);
  authUrl.searchParams.append("redirect_uri", redirectUri);
  authUrl.searchParams.append("state", state);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("prompt", "consent");

  return NextResponse.redirect(authUrl.toString());
}
