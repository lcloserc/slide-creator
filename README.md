# SlideCreator

A full-stack web application for creating, editing, and generating presentation slide decks with AI.

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+ (running locally)
- **OpenAI API key** (for AI generation feature)

## Setup

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Set up the database

Follow the instructions in [`database/README.md`](database/README.md) to create the database, a database user, and apply the schema and seed data.

### 3. Configure environment variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and set `DATABASE_URL` to match the user and database you created, and add your `OPENAI_API_KEY`.

### 4. Start the development servers

```bash
npm run dev
```

This runs both the backend (port 3001) and frontend (port 5173) concurrently.

Open **http://localhost:5173** in your browser.

## Project Structure

```
SlideCreator/
├── database/                # Database scripts & setup docs
│   ├── README.md            # How to create DB, apply schema, update models
│   ├── 01_schema.sql        # Table definitions (DROP + CREATE)
│   ├── 02_seed.sql          # Default seed data (upserts)
│   └── setup.sh             # Run SQL scripts + prisma generate
│
├── server/                  # Backend (Express + Prisma + PostgreSQL)
│   ├── prisma/
│   │   └── schema.prisma    # Prisma ORM schema (must match 01_schema.sql)
│   ├── src/
│   │   ├── index.ts         # Express app entry point
│   │   ├── lib/prisma.ts    # Prisma client singleton
│   │   └── routes/          # API route handlers
│   ├── .env.example         # Template for environment variables
│   └── package.json
│
├── client/                  # Frontend (React + Vite + Tailwind)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/      # UI components
│   │   ├── store/           # Zustand state management
│   │   ├── types/           # TypeScript types & theme presets
│   │   ├── lib/             # API client & PPTX export
│   │   └── styles/          # Tailwind + custom CSS
│   └── index.html
│
└── package.json             # Root scripts (dev, install:all)
```

## Features

- **Projects** — organize work into separate projects with folders and files
- **Tree view** — collapsible sidebar with nested folders, drag-and-drop to reorganize, right-click to rename/duplicate/delete
- **Text editor** — edit source files, generation prompts, and system prompts
- **Slide editor** — visual WYSIWYG editor with contenteditable blocks (text, bullets, numbered lists, tables, quotes)
- **Theme presets** — Dark, Light, Warm, Midnight — instantly switchable
- **AI generation** — generate presentations from source material via OpenAI API
- **PPTX export** — download native editable PowerPoint files
- **Presentation mode** — fullscreen slideshow with keyboard navigation and speaker notes
- **In-app manual** — quick-reference guide accessible from the ☰ menu, with PDF download
