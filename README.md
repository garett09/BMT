Mobile-first Buni Money Tracker clone using Next.js App Router, Tailwind, NextAuth, and Upstash Redis.

Quick start

1. Create `.env.local` with:

```
UPSTASH_REDIS_REST_URL=your_url
UPSTASH_REDIS_REST_TOKEN=your_token
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

2. Install and run

```
npm install
npm run dev
```

3. Open http://localhost:3000

4. Register, then login, add transactions
