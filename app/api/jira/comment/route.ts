import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const {
      domain,
      email,
      token,
      issueKey,
      comment,
      authType,
      accessToken,
      cloudId,
    } = await req.json();

    if (!issueKey || !comment) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    let jiraUrl = "";
    let authHeader = "";

    if (authType === "oauth") {
      if (!accessToken || !cloudId) {
        return NextResponse.json(
          { error: "Missing OAuth credentials" },
          { status: 400 },
        );
      }
      jiraUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}/comment`;
      authHeader = `Bearer ${accessToken}`;
    } else {
      if (!domain || !email || !token) {
        return NextResponse.json(
          { error: "Missing Jira credentials" },
          { status: 400 },
        );
      }
      authHeader = `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
      jiraUrl = `https://${domain}/rest/api/3/issue/${issueKey}/comment`;
    }

    const bodyData = {
      body: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: comment,
              },
            ],
          },
        ],
      },
    };

    await axios.post(jiraUrl, bodyData, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
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
