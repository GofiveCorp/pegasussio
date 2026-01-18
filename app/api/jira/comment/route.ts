import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const { domain, email, token, issueKey, comment } = await req.json();

    if (!domain || !email || !token || !issueKey || !comment) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const authHeader = `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;

    const jiraUrl = `https://${domain}/rest/api/3/issue/${issueKey}/comment`;

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
