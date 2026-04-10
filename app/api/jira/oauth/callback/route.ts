import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    return new NextResponse(
      `<html><body><h1>Auth Failed</h1><p>${error || "No code returned"}</p></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } },
    );
  }

  // Validate CSRF state
  const cookieStore = await cookies();
  const oauthStateCookie = cookieStore.get("jira_oauth_state");

  if (!oauthStateCookie?.value) {
    return new NextResponse(
      `<html><body><h1>Auth Failed</h1><p>Missing OAuth state cookie. Please try again.</p></body></html>`,
      { status: 403, headers: { "Content-Type": "text/html" } },
    );
  }

  let storedState: { state: string; playerId: string };
  try {
    storedState = JSON.parse(oauthStateCookie.value);
  } catch {
    return new NextResponse(
      `<html><body><h1>Auth Failed</h1><p>Invalid state cookie.</p></body></html>`,
      { status: 403, headers: { "Content-Type": "text/html" } },
    );
  }

  if (storedState.state !== state) {
    return new NextResponse(
      `<html><body><h1>Auth Failed</h1><p>State mismatch (CSRF protection).</p></body></html>`,
      { status: 403, headers: { "Content-Type": "text/html" } },
    );
  }

  const clientId = process.env.JIRA_CLIENT_ID;
  const clientSecret = process.env.JIRA_CLIENT_SECRET;
  const redirectUri =
    process.env.JIRA_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/jira/oauth/callback`;

  if (!clientId || !clientSecret) {
    return new NextResponse(
      `<html><body><h1>Configuration Error</h1><p>Missing Server Secrets</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } },
    );
  }

  try {
    // 1. Exchange code for tokens
    const tokenResponse = await axios.post(
      "https://auth.atlassian.com/oauth/token",
      {
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      },
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // 2. Get accessible resources (cloudId)
    const resourcesResponse = await axios.get(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      { headers: { Authorization: `Bearer ${access_token}` } },
    );

    const resources = resourcesResponse.data;
    if (!resources || resources.length === 0) {
      throw new Error("No accessible resources found for this user.");
    }

    const cloudId = resources[0].id;
    const siteName = resources[0].name;

    // 3. Store tokens server-side in Supabase
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
    const supabase = createServerSupabase();

    // Upsert: delete old session for this player, insert new one
    if (storedState.playerId) {
      await supabase
        .from("jira_sessions")
        .delete()
        .eq("player_id", storedState.playerId);
    }

    const { data: session } = await supabase
      .from("jira_sessions")
      .insert({
        player_id: storedState.playerId || null,
        access_token,
        refresh_token: refresh_token || null,
        cloud_id: cloudId,
        site_name: siteName,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    // 4. Set session cookie (httpOnly, 7 days)
    cookieStore.set("jira_session_id", session?.id || "", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    // Clear state cookie
    cookieStore.delete("jira_oauth_state");

    // 5. Return HTML that sends ONLY siteName back (NO tokens!)
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Auth Success</title></head>
        <body>
          <h1>Authentication Successful</h1>
          <p>Connecting to ${siteName}...</p>
          <script>
            window.opener.postMessage(${JSON.stringify({
              type: "JIRA_OAUTH_SUCCESS",
              siteName,
            })}, window.location.origin);
            setTimeout(() => window.close(), 1000);
          </script>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err: any) {
    console.error("OAuth Error:", err.response?.data || err.message);
    return new NextResponse(
      `<html><body><h1>Authentication Failed</h1><p>${err.message}</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } },
    );
  }
}
