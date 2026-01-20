import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const {
      domain,
      email,
      token,
      issueKey,
      score,
      authType,
      accessToken,
      cloudId,
    } = await req.json();

    if (!issueKey || score === undefined || score === null) {
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
      // PUT /rest/api/3/issue/{issueKeyOrId}
      jiraUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}`;
      authHeader = `Bearer ${accessToken}`;
    } else {
      if (!domain || !email || !token) {
        return NextResponse.json(
          { error: "Missing Jira credentials" },
          { status: 400 },
        );
      }
      authHeader = `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
      jiraUrl = `https://${domain}/rest/api/3/issue/${issueKey}`;
    }

    // Parse score to number
    const numericScore = parseFloat(score);
    if (isNaN(numericScore)) {
      return NextResponse.json(
        { error: "Score must be a valid number for Story Points" },
        { status: 400 },
      );
    }

    // ---------------------------------------------------------
    // 1. DYNAMICALLY FIND "Story Points" FIELD ID
    // ---------------------------------------------------------
    let storyPointsFieldId = "customfield_10016"; // Fallback default
    try {
      // Construct base URL for field search
      let fieldsUrl = "";
      if (authType === "oauth") {
        fieldsUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/field`;
      } else {
        fieldsUrl = `https://${domain}/rest/api/3/field`;
      }

      const fieldsRes = await axios.get(fieldsUrl, {
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
      });

      const spField = fieldsRes.data.find(
        (f: any) => f.name === "Story Points" || f.name === "Story points",
      );

      if (spField) {
        storyPointsFieldId = spField.id;
      } else {
        console.warn(
          "Could not find field named 'Story Points'. Using default: customfield_10016",
        );
      }
    } catch (fieldError: any) {
      console.error(
        "Failed to fetch Jira fields for lookup. Using default.",
        fieldError.message,
      );
    }

    // ---------------------------------------------------------
    // 2. UPDATE ISSUE
    // ---------------------------------------------------------
    const bodyData = {
      fields: {
        [storyPointsFieldId]: numericScore,
      },
    };

    await axios.put(jiraUrl, bodyData, {
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
          JSON.stringify(error.response?.data?.errors) ||
          "Failed to update Jira issue",
      },
      { status: error.response?.status || 500 },
    );
  }
}
