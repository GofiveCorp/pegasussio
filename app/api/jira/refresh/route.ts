import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getJiraAuth, JiraAuthError } from "@/lib/jira-auth";

export async function POST(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const jiraSessionId = cookieStore.get("jira_session_id")?.value;

    if (!jiraSessionId) {
      return NextResponse.json(
        { error: "No Jira session found" },
        { status: 401 },
      );
    }

    // getJiraAuth auto-refreshes if needed
    await getJiraAuth(jiraSessionId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof JiraAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 500 },
    );
  }
}
