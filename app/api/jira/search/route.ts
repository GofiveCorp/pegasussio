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

    const { jql, maxResults } = await req.json();
    const { accessToken, cloudId } = await getJiraAuth(jiraSessionId);

    const jiraUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search/jql`;

    const response = await axios.post(
      jiraUrl,
      {
        jql: jql || "sprint in openSprints() AND assignee = currentUser()",
        fields: ["summary", "status", "issuetype"],
        maxResults: maxResults || 20,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    const issues = response.data.issues.map((issue: any) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      type: issue.fields.issuetype.name,
      typeIcon: issue.fields.issuetype.iconUrl,
    }));

    return NextResponse.json({ issues });
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
          "Failed to fetch from Jira",
      },
      { status: error.response?.status || 500 },
    );
  }
}
