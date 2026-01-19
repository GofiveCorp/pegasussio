import { NextResponse } from "next/server";
import {
  EMAIL_SUFFIX,
  AUTH_PASSWORD,
  SESSION_COOKIE_NAME,
} from "@/utils/auth-config";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, displayName } = body;

    // Basic validation
    if (!email || !password || !displayName) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Password check
    if (password !== AUTH_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Email suffix check
    if (!email.toLowerCase().endsWith(EMAIL_SUFFIX)) {
      return NextResponse.json(
        { error: `Email must end with ${EMAIL_SUFFIX}` },
        { status: 403 },
      );
    }

    const response = NextResponse.json({ success: true });

    // Set cookie with display name
    const sessionData = {
      email,
      displayName, // Save display name for auto-fill in app
      loggedInAt: Date.now(),
    };

    response.cookies.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
