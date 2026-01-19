import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/utils/auth-config";

export async function POST(req: Request) {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
