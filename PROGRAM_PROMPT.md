# Prompt: Build a Slide Editor with AI Generation, Projects, and PPTX Export

## Overview

Build a full-stack web application for creating, editing, and generating presentation slide decks. The application is organized around **projects** — each project holds source files, generated presentations, and edited presentations. A set of **program-level resources** (generation prompts, system prompts, and slide templates) are shared across all projects.

Users can:
- Upload source material (any text-based file) into a project
- Generate presentations from source material using the OpenAI API
- Edit generated presentations visually in a structured slide editor
- Export presentations to PowerPoint (.pptx) with native editable text and tables
- Organize everything in a tree view with folders

**Stack:** React 18 + Vite frontend, Node.js + Express backend, PostgreSQL database, Prisma ORM, Zustand state management, Tailwind CSS styling, PptxGenJS for PPTX export, OpenAI SDK for generation.

---

## Project Structure

```
SlideCreator/
├── database/                    # Database scripts (source of truth for schema)
│   ├── 01_schema.sql            # DROP + CREATE all tables
│   ├── 02_seed.sql              # Default seed data (upserts)
│   └── setup.sh                 # Runs SQL scripts + prisma generate
│
├── server/                      # Backend (Express + Prisma)
│   ├── prisma/
│   │   └── schema.prisma        # Prisma ORM schema (must match 01_schema.sql)
│   ├── src/
│   │   ├── index.ts             # Express app entry point
│   │   ├── lib/
│   │   │   └── prisma.ts        # Prisma client singleton
│   │   └── routes/
│   │       ├── projects.ts
│   │       ├── folders.ts
│   │       ├── resources.ts
│   │       ├── generationPrompts.ts
│   │       ├── systemPrompts.ts
│   │       ├── slideTemplates.ts
│   │       ├── generate.ts      # OpenAI integration
│   │       └── upload.ts        # Multipart file upload (multer)
│   ├── .env.example             # Template for environment variables
│   ├── package.json
│   └── tsconfig.json
│
├── client/                      # Frontend (React + Vite + Tailwind)
│   ├── public/
│   │   ├── logo.png            # Application logo (replaces default icon + title)
│   │   └── vite.svg
│   ├── src/
│   │   ├── main.tsx             # ReactDOM entry
│   │   ├── App.tsx              # Root component
│   │   ├── components/
    │   │   │   ├── TopBar.tsx
    │   │   │   ├── TreePanel.tsx    # Custom-built tree view
    │   │   │   ├── EditorPanel.tsx  # Routes to TextEditor or SlideEditor
    │   │   │   ├── TextEditor.tsx   # Textarea for source files / prompts
    │   │   │   ├── SlideEditor.tsx  # Full slide editor with thumbnails
    │   │   │   ├── SlideCanvas.tsx  # Contenteditable slide rendering
    │   │   │   ├── BlockToolbar.tsx # Floating block actions
    │   │   │   ├── GenerateDialog.tsx
    │   │   │   ├── ManualModal.tsx  # In-app manual with PDF download
    │   │   │   └── PresentationMode.tsx
│   │   ├── store/
│   │   │   └── index.ts         # Zustand store (all app state)
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript types + theme presets
│   │   ├── lib/
│   │   │   ├── api.ts           # Fetch-based API client
│   │   │   └── pptxExport.ts    # PPTX generation via PptxGenJS
│   │   └── styles/
│   │       └── index.css        # Tailwind directives + custom classes
│   ├── index.html
│   ├── vite.config.ts           # Vite config with /api proxy to backend
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── package.json                 # Root monorepo scripts
├── README.md
└── PROGRAM_PROMPT.md
```

---

## Environment Configuration

Application config lives in `server/.env` (copied from `server/.env.example`):

```env
# Prisma database connection (used by the app at runtime)
DATABASE_URL="postgresql://slide_app:slide_app@localhost:5432/slide_creator?schema=public"

# OpenAI
OPENAI_API_KEY="your-openai-api-key-here"
OPENAI_MODEL="gpt-4o"
OPENAI_TEMPERATURE="0.7"

# Server
PORT=3001
```

Database admin credentials (for creating the DB, running schema scripts) are **not** stored in `.env`. They are passed directly to `psql` when running the setup script — see `database/README.md`.

---

## Database Setup

Database management uses **raw SQL scripts** in the `database/` folder — not Prisma migrations. Full setup instructions are in `database/README.md`.

| File | Purpose |
|------|---------|
| `01_schema.sql` | Drops all tables (`CASCADE`) then recreates them. Defines indexes. |
| `02_seed.sql` | Inserts default data using `ON CONFLICT ... DO UPDATE` for idempotency. |
| `setup.sh` | Runs both SQL files via `psql`, then runs `npx prisma generate`. Uses standard psql auth (CLI flags, `PGUSER`/`PGPASSWORD` env vars, `~/.pgpass`). |
| `README.md` | Instructions for creating the database, a dedicated app user, applying the schema, and updating after model changes. |

**Typical usage:**
```bash
# First time: create DB and user manually (see database/README.md), then:
./database/setup.sh -U slide_app -d slide_creator

# After schema changes:
./database/setup.sh -U slide_app -d slide_creator
```

The Prisma schema at `server/prisma/schema.prisma` must be kept in sync with `01_schema.sql` manually — Prisma uses it to generate the TypeScript client, but the SQL scripts are the source of truth for the actual database structure.

---

## Data Model (PostgreSQL)

### Program-Level Resources

These are global — accessible from any project.

**`generation_prompts`** — prompts that instruct the LLM how to generate a presentation from source material.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | default `gen_random_uuid()` |
| name | text, not null | display name |
| content | text, not null | the prompt text |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |

**`system_prompts`** — system-level instructions sent to the OpenAI API as the system message.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | default `gen_random_uuid()` |
| name | text, not null | |
| content | text, not null | |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |

**`slide_templates`** — reusable presentation templates (stored as the JSON slide model, representing a starting structure and theme).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | default `gen_random_uuid()` |
| name | text, not null | |
| template_data | jsonb, not null | JSON slide model (theme + slide structure) |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |

### Projects and Resources

**`projects`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | default `gen_random_uuid()` |
| name | text, not null | |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |

**`folders`** — supports nested folder structure within a project's tree.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | default `gen_random_uuid()` |
| project_id | uuid, FK → projects | ON DELETE CASCADE |
| parent_id | uuid, FK → folders, nullable | null = root level, ON DELETE CASCADE |
| name | text, not null | |
| sort_order | integer, default 0 | position within parent |
| created_at | timestamptz | default `now()` |

Indexes: `idx_folders_project` on `project_id`, `idx_folders_parent` on `parent_id`.

**`resources`** — every file in a project: uploaded source files, generated presentations, edited presentations.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | default `gen_random_uuid()` |
| project_id | uuid, FK → projects | ON DELETE CASCADE |
| folder_id | uuid, FK → folders, nullable | null = project root, ON DELETE SET NULL |
| name | text, not null | file name displayed in tree |
| resource_type | text, not null | `'source_file'`, `'presentation'` |
| content_text | text, nullable | raw text content (for source files) |
| content_json | jsonb, nullable | JSON slide model (for presentations) |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |

Indexes: `idx_resources_project` on `project_id`, `idx_resources_folder` on `folder_id`.

### Seed Data

The `02_seed.sql` script inserts:

- **One default generation prompt** (`00000000-...001`) — instructs the LLM to create 8–15 slides, use various block types, and return valid JSON matching the `PresentationData` schema.
- **One default system prompt** (`00000000-...002`) — "You are a presentation design assistant..."
- **Two slide templates**: Dark theme (`00000000-...003`) and Light theme (`00000000-...004`), each with a title slide and a content slide.

### JSON Slide Model (stored in `content_json` and `template_data`)

```typescript
interface PresentationData {
  title: string;
  theme: Theme;
  slides: Slide[];
}

interface Slide {
  id: string;
  title: string;
  blocks: Block[];
  notes: string;
}

type Block =
  | { type: "text"; content: string }
  | { type: "bullets"; items: string[] }
  | { type: "numbered"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "quote"; content: string };

interface Theme {
  backgroundColor: string;
  titleColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
}
```

---

## Application Layout

### Top Bar (`TopBar.tsx`)

- Application logo (left) — custom `logo.png` image loaded from `client/public/logo.png`
- Current project name (editable inline — click to edit, Enter to save, Escape to cancel)
- **"Generate"** button — prominent blue button, visible when a project is selected. Opens the generation dialog.
- **"Export PPTX"** button — visible when a presentation or slide template is open
- **"Present"** button — visible when a presentation or slide template is open
- **Hamburger menu** (☰, far right) — dropdown menu with app-level actions. Currently contains **Manual**, which opens an in-app quick-reference guide in a modal overlay with a PDF download option.

### Left Panel: Tree View (`TreePanel.tsx`)

A custom-built file-tree navigator. The entire sidebar is collapsible via a thin toggle strip between the sidebar and the editor (chevron button in `App.tsx`, controlled by `sidebarCollapsed` state).

The tree has two root sections, plus a project selector:

**1. Program Resources (top section, always visible regardless of selected project)**

A collapsible section containing three collapsible subsections, each with a [+] button to add new items:
```
▶ Program Resources
  ▶ Generation Prompts      [+ button to add new]
    📄 Default generation prompt
    ...
  ▶ System Prompts           [+ button to add new]
    📄 Default system prompt
    ...
  ▶ Slide Templates           [+ button to add new]
    📄 Dark theme template
    📄 Light theme template
    ...
```

**2. Project selector**

A "Project" label followed by a dropdown to switch between projects, a [+] button to create new, and a delete button. Separated from Program Resources by a divider.

**3. Project Resources (below, scoped to the selected project)**

A collapsible "Project Resources" root section (using `SectionHeader` with id `project-resources`). The "New folder" and "Upload file" icon buttons appear in the section header row (visible on hover via `rightActions` prop on `SectionHeader`), followed by the recursive project file tree:

```
▶ Project Resources  [📁+] [📤] (hover to reveal)
  ▶ Source Material
    📄 uploaded-report.md
  📄 My edited deck.json
```

**File upload** supports selecting multiple files at once. When more than one file is selected, a confirmation modal asks "Really upload X files?" before proceeding. The store provides both `uploadFile` (single) and `uploadFiles` (batch, single reload) methods.

**Tree interactions:**
- Click a resource to open it in the editor panel
- Collapsible folders and sections (tracked via `expandedFolders` and `expandedSections` state)
- Right-click context menu: **Rename**, **Duplicate** (all item types except folders), and **Delete**
- **Drag and drop:** files and folders within Project Resources can be dragged and dropped to reorganize. Drop a resource or folder onto a folder to move it inside; drop onto the root area to move it back to the top level. Folders cannot be dropped into their own subtree (circular reference prevention via `isDescendant` check). Visual feedback: blue highlight ring on the drop target. Uses native HTML5 drag-and-drop (no library).
- Sidebar collapse/expand toggle (thin vertical button between sidebar and editor)

### Center/Right Panel: Editor (`EditorPanel.tsx`)

The editor panel changes based on what is selected in the tree:

**When nothing is selected:** empty state with an icon and "No file selected" message.

**When a source file is selected:** full-height `<textarea>` for viewing and editing raw text. Auto-saves on change (debounced ~1 second).

**When a generation prompt or system prompt is selected:** same textarea view with the prompt name shown as a label above.

**When a slide template or presentation is selected:** the visual slide editor (described below).

---

## Slide Editor (`SlideEditor.tsx`, `SlideCanvas.tsx`, `BlockToolbar.tsx`)

### Layout (within the editor panel)

1. **Editor toolbar (top bar):** theme selector dropdown (Dark/Light/Warm/Midnight), slide notes toggle button, current slide indicator ("Slide N of M").

2. **Slide thumbnail sidebar (left, 192px wide):** miniature slide previews showing title and first few blocks. Click to select. Buttons: add slide, duplicate slide, delete slide, move up, move down.

3. **Slide canvas (center):** the selected slide rendered at 16:9 aspect ratio with the theme's background color. Title and all content blocks are directly editable using `contenteditable` elements.

4. **Speaker notes (below canvas, toggled):** a textarea for editing `slide.notes`.

### Editing Behavior

- **Title:** a single `contenteditable` heading mapped to `slide.title`, styled with `theme.titleColor`, 30px bold.
- **Text block:** `contenteditable` div. Supports browser-native inline formatting.
- **Bullet/numbered list:** rendered as `<ul>` / `<ol>` with `contenteditable` items. Enter adds a new item after the current one. Backspace on an empty item removes it.
- **Table:** HTML `<table>` with `contenteditable` cells. Tab moves to the next cell. When focused, buttons appear below: "+ Row", "+ Column", "- Row", "- Column".
- **Quote:** styled `contenteditable` div with a left accent border and subtle background.
- **Block toolbar (floating):** appears above the focused block. Actions: add block (dropdown to choose type: Text, Bullets, Numbered, Table, Quote), move up, move down, delete.
- **Auto-save:** every edit updates the JSON slide model in the Zustand store and persists to the backend via the API (debounced ~1 second).

---

## Generation Feature (`GenerateDialog.tsx`, `server/src/routes/generate.ts`)

### The "Generate" Button

Clicking "Generate" in the top bar opens a modal dialog with the following sections:

**1. Source Material Selection**
- A checklist of all resources in the current project
- File names shown with folder paths for clarity
- Select-all / Deselect-all buttons
- Resource type shown as a badge ("Source" or "Presentation")

**2. Generation Prompt Selection**
- A dropdown listing all generation prompts
- Preview of the selected prompt text (first 300 chars) below the dropdown

**3. System Prompt Selection**
- A dropdown listing all system prompts
- Preview of the selected prompt text below the dropdown

**4. Slide Template Selection (optional)**
- A dropdown listing all slide templates, plus a "None" option

**5. Output Settings**
- **Output folder:** a dropdown of folders in the current project, plus "Project root"
- **Output name:** a text input, default: "[Project Name] - Presentation - Generated - YYMMDD:HH:MM:SS" (24-hour clock)

**6. "Generate" confirmation button** at the bottom, "Cancel" button beside it.

### Generation Process (OpenAI API)

When the user confirms generation:

1. **Frontend** sends `POST /api/generate` with:
   ```json
   {
     "projectId": "uuid",
     "sourceResourceIds": ["uuid", ...],
     "generationPromptId": "uuid",
     "systemPromptId": "uuid",
     "slideTemplateId": "uuid | null",
     "outputFolderId": "uuid | null",
     "outputName": "string"
   }
   ```

2. **Backend** (`server/src/routes/generate.ts`):
   - Fetches all referenced records from the database in parallel
   - Assembles the user message: each source prefixed with `=== SOURCE: [name] ===`, optional template block, then the generation prompt content last
   - Calls the OpenAI API via the **OpenAI SDK** (`openai` package):
     - Model: `process.env.OPENAI_MODEL` (default `gpt-4o`)
     - Temperature: `process.env.OPENAI_TEMPERATURE` (default `0.7`)
     - `response_format: { type: "json_object" }` for guaranteed JSON output
   - Parses the response JSON, validates it has a `slides` array
   - Saves as a new resource with `resource_type: 'presentation'`
   - Returns the created resource

3. **Frontend** on success: reloads project data, opens the new presentation in the editor, closes the dialog.

4. **UI during generation:**
   - Spinner + "Generating..." text on the button
   - Generate and Cancel buttons disabled during request
   - On error: error message shown in the dialog, dialog stays open for retry

### OpenAI API Key

- Stored in `server/.env` as `OPENAI_API_KEY`
- The frontend never sees the key — all calls go through `POST /api/generate`

---

## Backend API (Node.js + Express)

### Server Setup (`server/src/index.ts`)

- Express with CORS enabled
- JSON body parser with 50MB limit
- All routes mounted under `/api`
- Prisma client singleton at `server/src/lib/prisma.ts`
- Environment loaded via `dotenv`

### Endpoints

**Projects** (`/api/projects`):
- `GET /api/projects` — list all projects (ordered by `createdAt` desc)
- `POST /api/projects` — create a project
- `PATCH /api/projects/:id` — rename a project
- `DELETE /api/projects/:id` — delete a project (cascades to folders and resources)

**Folders** (mounted on `/api`):
- `GET /api/projects/:projectId/folders` — list folders (ordered by `sortOrder`)
- `POST /api/projects/:projectId/folders` — create a folder (accepts `name`, `parentId`)
- `PATCH /api/folders/:id` — update folder (`name`, `parentId`, `sortOrder`)
- `DELETE /api/folders/:id` — delete a folder (cascades to children)

**Resources** (mounted on `/api`):
- `GET /api/projects/:projectId/resources` — list resources (ordered by `createdAt`)
- `POST /api/projects/:projectId/resources` — create a resource
- `GET /api/resources/:id` — get a single resource with content
- `PATCH /api/resources/:id` — update a resource (`name`, `contentText`, `contentJson`, `folderId`)
- `DELETE /api/resources/:id` — delete a resource

**Program-Level Resources:**
- `GET/POST /api/generation-prompts`, `GET/PATCH/DELETE /api/generation-prompts/:id`
- `GET/POST /api/system-prompts`, `GET/PATCH/DELETE /api/system-prompts/:id`
- `GET/POST /api/slide-templates`, `GET/PATCH/DELETE /api/slide-templates/:id`

**Generation:**
- `POST /api/generate` — trigger AI generation (see Generation Feature section)

**File Upload:**
- `POST /api/projects/:projectId/upload` — multipart file upload via multer (in-memory storage, 10MB max). Reads file content as UTF-8 text, creates a resource with `resource_type: 'source_file'`. Accepts optional `folderId` form field.

---

## Export to PPTX (`client/src/lib/pptxExport.ts`)

Uses **PptxGenJS** (`pptxgenjs`) on the frontend to generate a native, editable PowerPoint file from the JSON slide model.

Mapping from the data model to PptxGenJS:

- `theme` → slide dimensions 16:9 (13.333 × 7.5 inches), background color on every slide.
- `Slide.title` → `slide.addText()` at top of slide, theme title color, 30pt bold.
- `Block type: "text"` → `slide.addText()`. Parses inline HTML bold/italic tags (`<b>`, `<strong>`, `<i>`, `<em>`) into PptxGenJS text runs.
- `Block type: "bullets"` → `slide.addText()` with `bullet: true` per item.
- `Block type: "numbered"` → `slide.addText()` with `bullet: { type: 'number' }`.
- `Block type: "table"` → `slide.addTable()` with styled header row (bold, white text, accent background color), 1pt gray borders.
- `Block type: "quote"` → `slide.addText()` with background fill and italic.
- `Slide.notes` → `slide.addNotes()`.

Blocks stack vertically below the title with 0.15" gaps. Export triggers a browser download of the `.pptx` file.

---

## Presentation Mode (`PresentationMode.tsx`)

Full-screen slideshow:

- Renders slides one at a time using `SlideCanvas` in read-only mode, scaled to fill viewport.
- Attempts `requestFullscreen` on mount, exits on unmount.
- **Navigation:** Arrow keys, Space to advance; Arrow Up/Left to go back; Click anywhere to advance.
- **Escape** to exit presentation mode.
- **N key** toggles speaker notes overlay (dark panel at bottom of screen).
- Slide counter shown at bottom-right.
- Exit button (×) at top-right.

---

## In-App Manual (`ManualModal.tsx`)

A quick-reference manual accessible via the hamburger menu (☰) in the top bar.

- Opens as a modal overlay (`ManualModal` component, rendered from `App.tsx` with local `manualOpen` state)
- Covers: interface overview, resource types, program resources, generation flow, and key features
- **Download PDF** button in the modal header — uses `html2pdf.js` (dynamically imported) to render the modal content to a PDF and trigger a browser download (`SlideCreator-Manual.pdf`)
- Type declarations for `html2pdf.js` are in `client/src/html2pdf.d.ts`

---

## Theming

4 built-in theme presets (defined in `client/src/types/index.ts` as `THEME_PRESETS`):

1. **Dark** — `#1A1A2E` background, `#4EC9B0` accent, `#FFFFFF` title, `#E0E0E0` text
2. **Light** — `#FFFFFF` background, `#2563EB` accent, `#1A1A2E` title, `#374151` text
3. **Warm** — `#FFF8F0` background, `#E67E22` accent, `#3E2723` title, `#4E342E` text
4. **Midnight** — `#0D1117` background, `#58A6FF` accent, `#E6EDF3` title, `#8B949E` text

All presets use `fontFamily: 'Inter'`.

Themes apply globally to all slides in a presentation. The theme is stored in the JSON slide model and read by both the slide canvas (inline styles) and the PPTX export.

Users can create custom themes via the slide template system.

---

## State Management (`client/src/store/index.ts`)

Single Zustand store holding all application state:

- **Data:** `projects`, `currentProjectId`, `folders`, `resources`, `generationPrompts`, `systemPrompts`, `slideTemplates`
- **UI state:** `editorTarget` (what's open in the editor), `generateDialogOpen`, `presentationMode`
- **Actions:** async functions for all CRUD operations that call the API and refresh local state
- **`updatePresentationData`:** optimistic local update for the slide editor (updates both the `resources` array and the `editorTarget` in one shot)

The `editorTarget` is a discriminated union:
```typescript
type EditorTarget =
  | { type: 'none' }
  | { type: 'resource'; resource: Resource }
  | { type: 'generation_prompt'; item: GenerationPrompt }
  | { type: 'system_prompt'; item: SystemPrompt }
  | { type: 'slide_template'; item: SlideTemplate };
```

---

## API Client (`client/src/lib/api.ts`)

A thin wrapper around `fetch` with:
- Base URL: `/api` (proxied to backend via Vite dev server config)
- Automatic `Content-Type: application/json` headers
- Error extraction from response JSON
- Organized by entity: `api.projects.*`, `api.folders.*`, `api.resources.*`, etc.
- `api.upload()` uses `FormData` for multipart file upload (no JSON content-type header)

---

## Styling

**Tailwind CSS** with custom component classes defined in `client/src/styles/index.css`:

- `.btn-primary` — blue button with hover/disabled states
- `.btn-secondary` — gray bordered button
- `.btn-danger` — red-tinted button
- `.btn-icon` — minimal icon-only button
- `.input`, `.select` — form elements with focus ring
- `.tree-item` / `.tree-item.active` — tree node styling
- `.context-menu` / `.context-menu-item` — right-click menu
- `.slide-thumbnail` / `.slide-thumbnail.active` — thumbnail strip items
- `.slide-canvas` — 16:9 aspect ratio container
- `.scrollbar-thin` — slim custom scrollbar

`contenteditable` elements get a blue outline on focus and placeholder text via `data-placeholder` attribute + `::before` pseudo-element.

Font: **Inter** (loaded from Google Fonts in `index.html`).

---

## Technical Requirements

- **Frontend:** React 18 with Vite, TypeScript
- **Backend:** Node.js + Express, TypeScript (dev via `tsx watch`)
- **Database:** PostgreSQL, managed via raw SQL scripts in `database/`
- **ORM:** Prisma (schema for client generation, raw SQL for DDL)
- **Styling:** Tailwind CSS
- **State management:** Zustand (single store)
- **PPTX generation:** `pptxgenjs` (client-side)
- **PDF manual export:** `html2pdf.js` (client-side, dynamically imported)
- **AI generation:** OpenAI SDK (`openai` package, called from backend)
- **File upload:** multer (backend, in-memory storage), File API (frontend)
- **Tree view:** custom-built with React state for expand/collapse
- **Unique IDs:** `crypto.randomUUID()` (frontend) and `gen_random_uuid()` (PostgreSQL)
- **Environment variables (`server/.env`):** `DATABASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TEMPERATURE`, `PORT`
- **Dev proxy:** Vite proxies `/api` requests to `http://localhost:3001`

---

## Non-Goals (out of scope)

- No image/media support in slides (text and tables only)
- No animations or slide transitions
- No collaborative editing or real-time multi-user
- No free-form positioning (structured block model only)
- No PDF export of presentations (PPTX only; the in-app manual has its own PDF download)
- No user authentication (single-user application)
- No drag-and-drop reordering (items can be moved between folders but not reordered within a folder)

---

## Quality Expectations

- The slide editor should feel responsive — edits reflect instantly, auto-save is invisible.
- The PPTX output must have real editable text and tables, not images.
- The tree view should handle dozens of resources smoothly — fast expand/collapse.
- The generation dialog should be clear and easy to use — no ambiguity about what will be sent to the API.
- Handle edge cases: empty slides, long text, wide tables, malformed LLM responses, empty projects, missing prompts.
- The UI should be clean and modern with adequate spacing, clear visual hierarchy, and readable typography.
- Works in modern Chrome, Firefox, and Safari.
