# Slack Broad Messenger

A web application to send messages to multiple Slack channels at once.

**Tech Stack**: TypeScript + Next.js 15+ + React 18+ + Firebase + Slack SDK + Vitest + Playwright

## Setup

```bash
npm install
```

## Development

### Start Development Server

```bash
npm run dev
```

### Start Firebase Emulator

```bash
npm run dev:firebase
```

### Run Tests

```bash
# All tests
npm test

# Specific test types
npm run test:unit
npm run test:integration
npm run test:contract
npm run test:e2e
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## ビルド

```
yarn build
```

## プロジェクトについて

- Next.js (App Router, TypeScript, Tailwind CSS, Biome)
- `src/` ディレクトリ構成
- import alias: `@/*`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
