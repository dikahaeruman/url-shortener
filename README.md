# Pendekin

A simple, fast, and privacy-focused URL shortener built with Next.js and Supabase.

## Features

- **Custom Short Slugs**: Choose a custom short URL alias or use an auto-generated 6-character code.
- **Link Expiration (TTL)**: Optional expiration timer (1 hour, 24 hours, 7 days, 30 days, or never).
- **Instant QR Codes**: View and download high-res PNG QR codes for any short link.
- **Auto Webpage Titles & Favicons**: Automatically fetches target page titles and domain favicons.
- **Client Privacy**: Links are scoped per browser client using persistent UUID client headers.
- **Admin Dashboard**: Protected console at `/admin` for viewing global metrics, searching, filtering, and managing all shortened links.
- **Built-in Security**: Includes SSRF protections, loopback/private IP filtering, self-loop prevention, and Supabase Row Level Security (RLS).

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (Postgres)
- **Styling**: Tailwind CSS
- **Supported Runtimes**: Node.js, Bun, Deno

## Getting Started

### 1. Prerequisites

Node.js 18+ (or Bun / Deno runtime) installed on your system.

### 2. Environment Setup

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
ADMIN_SECRET_KEY=pendekin-admin-2026
```

### 3. Supabase Schema Setup

Run the following SQL statement in your Supabase SQL Editor:

```sql
CREATE TABLE public.urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_url TEXT NOT NULL,
  short_code TEXT UNIQUE NOT NULL,
  clicks INT DEFAULT 0,
  client_id TEXT,
  title TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on urls" ON public.urls FOR SELECT USING (true);
CREATE POLICY "Allow public insert on urls" ON public.urls FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on urls" ON public.urls FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on urls" ON public.urls FOR DELETE USING (true);
```

### 4. Development Server

Run the development server using your preferred package manager:

```bash
# Using Bun (Recommended)
bun install
bun run dev

# Using npm
npm install
npm run dev

# Using pnpm
pnpm install
pnpm dev

# Using Deno
deno install
deno task dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Admin Dashboard

Access the admin dashboard at `http://localhost:3000/admin`.

- **Authentication**: Prompted for the `ADMIN_SECRET_KEY` set in your `.env.local`.
- **Capabilities**: View total links & click statistics, search by title/URL/Client ID, filter active vs expired links, preview QR codes, and perform admin link deletions.

## Docker Deployment

To build and run the production image using Docker Compose:

```bash
docker compose up -d --build
```

The container starts a lightweight standalone server accessible at `http://localhost:3000`.

## License

MIT
