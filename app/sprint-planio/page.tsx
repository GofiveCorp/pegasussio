import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/utils/auth-config";
import SprintPlanioLobby from "./components/sprint-lobby";

export default async function Page() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  let defaultName = "";

  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie.value);
      defaultName = session.displayName || "";
    } catch {
      // invalid cookie
    }
  }

  return <SprintPlanioLobby defaultPlayerName={defaultName} />;
}
