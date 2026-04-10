import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";
import { getJiraAuth, JiraAuthError } from "@/lib/jira-auth";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const jiraSessionId = cookieStore.get("jira_session_id")?.value;

    if (!jiraSessionId) {
      return NextResponse.json(
        { error: "Not connected to Jira. Please authenticate first." },
        { status: 401 },
      );
    }

    const { issueKey, comment } = await req.json();

    if (!issueKey || !comment) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const { accessToken, cloudId } = await getJiraAuth(jiraSessionId);

    const jiraUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}/comment`;

    await axios.post(
      jiraUrl,
      {
        body: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: comment }],
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof JiraAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("Jira API Error:", error.response?.data || error.message);
    return NextResponse.json(
      {
        error:
          error.response?.data?.errorMessages?.[0] ||
          "Failed to post comment to Jira",
      },
      { status: error.response?.status || 500 },
    );
  }
}
