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

    const { issueKey, score } = await req.json();

    if (!issueKey || score === undefined || score === null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const numericScore = parseFloat(score);
    if (isNaN(numericScore)) {
      return NextResponse.json(
        { error: "Score must be a valid number for Story Points" },
        { status: 400 },
      );
    }

    const { accessToken, cloudId } = await getJiraAuth(jiraSessionId);
    const baseUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
    const authHeader = `Bearer ${accessToken}`;

    // Dynamically find "Story Points" field ID
    let storyPointsFieldId = "customfield_10016";
    try {
      const fieldsRes = await axios.get(`${baseUrl}/field`, {
        headers: { Authorization: authHeader, Accept: "application/json" },
      });

      const spField = fieldsRes.data.find(
        (f: any) => f.name === "Story Points" || f.name === "Story points",
      );

      if (spField) {
        storyPointsFieldId = spField.id;
      }
    } catch (fieldError: any) {
      console.error(
        "Failed to fetch Jira fields for lookup. Using default.",
        fieldError.message,
      );
    }

    // Update issue
    await axios.put(
      `${baseUrl}/issue/${issueKey}`,
      { fields: { [storyPointsFieldId]: numericScore } },
      {
        headers: {
          Authorization: authHeader,
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
          JSON.stringify(error.response?.data?.errors) ||
          "Failed to update Jira issue",
      },
      { status: error.response?.status || 500 },
    );
  }
}
