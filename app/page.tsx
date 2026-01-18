import Link from "next/link";
import Image from "next/image";
import packageJson from "../package.json";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black relative">
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>
      <main className="flex min-h-screen w-full flex-col items-center justify-center p-8 text-center sm:items-start sm:text-left">
        <div className="mb-8 flex justify-center sm:justify-start">
          <Image
            src="/images/pegasus-logo.jpg"
            alt="Pegasussio Logo"
            width={120}
            height={120}
            className="rounded-2xl shadow-lg"
          />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-6xl flex items-center gap-4">
          Pegasussio Super App
          <Badge variant="secondary" className="text-sm px-2 py-1 h-7">
            v{packageJson.version}
          </Badge>
        </h1>
        <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          The central hub for all your productivity tools.
        </p>
        <div className="mt-10 flex flex-wrap gap-4 justify-center sm:justify-start">
          <Link href="/pull-requestio">
            <Card className="hover:shadow-md transition-shadow cursor-pointer w-[280px]">
              <CardHeader className="flex flex-row items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src="/images/pull-requestio-logo.png"
                    alt="Pull Requestio Logo"
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <CardTitle className="text-base">Pull Requestio</CardTitle>
                  <CardDescription>Manage your PRs</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/sprint-planio">
            <Card className="hover:shadow-md transition-shadow cursor-pointer w-[280px]">
              <CardHeader className="flex flex-row items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600 text-white font-bold text-xl flex-shrink-0">
                  SP
                </div>
                <div className="flex flex-col">
                  <CardTitle className="text-base">Sprint Planio</CardTitle>
                  <CardDescription>Planning Poker</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </main>
      <div className="absolute bottom-4 text-xs text-zinc-400 right-0 left-0 text-center">
        Pegasussio v{packageJson.version}
      </div>
    </div>
  );
}
