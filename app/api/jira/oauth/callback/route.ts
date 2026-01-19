import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return new NextResponse(
      `<html><body><h1>Auth Failed</h1><p>${error || "No code returned"}</p></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } },
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
    // 1. Exchange Code for Token
    const tokenResponse = await axios.post(
      "https://auth.atlassian.com/oauth/token",
      {
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      },
    );

    const { access_token } = tokenResponse.data;

    // 2. Get Accessible Resources (Cloud ID)
    const resourcesResponse = await axios.get(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
    );

    const resources = resourcesResponse.data;
    if (!resources || resources.length === 0) {
      throw new Error("No accessible resources found for this user.");
    }

    // Just take the first one for now.
    // Ideally we might want to let the user pick if they belong to multiple sites.
    const cloudId = resources[0].id;
    const siteName = resources[0].name;

    // 3. Return HTML that posts message to opener
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Auth Success</title>
        </head>
        <body>
          <h1>Authentication Successful</h1>
          <p>Connecting to ${siteName}...</p>
          <script>
            // Send tokens to main window
            // Send tokens to main window
            const payload = ${JSON.stringify({
              type: "JIRA_OAUTH_SUCCESS",
              accessToken: access_token,
              cloudId: cloudId,
              siteName: siteName,
            })};
            
            window.opener.postMessage(payload, window.location.origin);
            // Close popup
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
