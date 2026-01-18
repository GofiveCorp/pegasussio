# Pegasussio Super App

**Pegasussio** is a unified super-app platform that integrates multiple productivity tools into a single, cohesive experience.

## Features

- **Central Hub**: A unified launchpad for all your applications.
- **Theme Support**: Built-in Dark Mode and Light Mode.

### Micro-Apps

#### 1. **Pull Requestio**

A streamlined dashboard for managing GitHub Pull Requests.

- **Dashboard**: View PRs across multiple repositories in one place.
- **Filtering**: Filter by branch, author, repository, or search text.
- **Smart Grouping**: PRs are grouped by repository for easy scanning.
- **Quick Links**: Direct access to creating new PRs.

#### 2. **Sprint Planio**

A real-time Agile planning poker application.

- **Multiplayer**: Real-time voting and presence using Supabase.
- **Session Management**: Create and join rooms easily.
- **Voting System**:
  - Classic Fibonacci deck.
  - Reveal/Hide mechanics.
  - View snapshots of past votes.
- **Ticket Management**:
  - Create, rename, and delete agenda items.
  - Custom score input for edge cases.
  - Edit scores and revote on completed tickets.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router & Turbopack)
- **Language**: TypeScript
- **Styling**:
  - [Tailwind CSS v4](https://tailwindcss.com/)
  - [Shadcn UI](https://ui.shadcn.com/) (Component Library)
- **State Management**: [Zustand](https://zustand.herokuapp.com/)
- **Backend & Realtime**: [Supabase](https://supabase.com/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Icons**: Lucide React
- **Runtime**: Bun

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0 or later)
- A Supabase project for real-time features.

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd pegasussio
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Setup Environment:
   Create a `.env.local` file in the root directory and add the following:

   ```bash
   # GitHub Integration
   # Comma-separated list of repositories to watch (optional default)
   NEXT_PUBLIC_WATCHED_REPOS=facebook/react,vercel/next.js

   # Supabase Configuration (Required for Sprint Planio)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:

   ```bash
   bun dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## License

MIT
