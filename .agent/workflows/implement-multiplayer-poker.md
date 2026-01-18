---
description: Implement Multiplayer Planning Poker with Supabase
---

# Multiplayer Sprint Planio Implementation

This workflow outlines the steps to upgrade Sprint Planio from a local-only app to a realtime multiplayer experience using Supabase.

## 1. Prerequisites & Setup

- [x] **Install Supabase Client**
  - Run: `bun add @supabase/supabase-js`
- [x] **Environment Variables**
  - Create/Update `.env.local` with:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Database Schema (Supabase)

You will need to run the following SQL in your Supabase SQL Editor:

```sql
-- Create Rooms table
create table public.rooms (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_revealed boolean default false,
  status text default 'active',
  card_deck text[],
  active_ticket_id uuid -- References tickets(id)
);

-- Create Tickets (Agendas) table
create table public.tickets (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  title text not null,
  description text,
  score text,
  status text default 'pending', -- 'pending', 'active', 'completed'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  votes_snapshot jsonb -- Stores array of {name, vote} when completed
);

-- Create Players table
create table public.players (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  name text not null,
  vote text,
  is_spectator boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Realtime
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.tickets;
```

### Updates

Run this to add the new `votes_snapshot` column:

```sql
alter table public.tickets add column votes_snapshot jsonb;
```

## 3. Implementation Steps

(Completed in codebase)
