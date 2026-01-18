import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const { domain, email, token, jql, maxResults } = await req.json();

    if (!domain || !email || !token) {
      return NextResponse.json(
        { error: "Missing Jira credentials" },
        { status: 400 },
      );
    }

    const authHeader = `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;

    const jiraUrl = `https://${domain}/rest/api/3/search/jql`;

    const response = await axios.post(
      jiraUrl,
      {
        jql: jql || "sprint in openSprints() AND assignee = currentUser()",
        fields: ["summary", "status", "issuetype"],
        maxResults: maxResults || 20,
      },
      {
        headers: {
          Authorization: authHeader,
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
