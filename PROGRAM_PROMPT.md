# Prompt: Build a Slide Editor with AI Generation, Projects, and PPTX Export

## Overview

Build a full-stack web application for creating, editing, and generating presentation slide decks. The application is organized around **projects** — each project holds source files, generated presentations, and edited presentations. A set of **program-level resources** (generation prompts, system prompts, output formats, and generation pipelines) are shared across all projects.

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
│   ├── seed.ts                  # Node.js seed script (reads seeds/ + upserts via Prisma)
│   ├── seeds/                   # Seed content files
│   │   ├── manifest.json        # Maps UUIDs to files + metadata
│   │   ├── output_formats/      # Format schema definitions (*.md)
│   │   ├── generation_prompts/  # Generation prompt content (*.md)
│   │   ├── system_prompts/      # System prompt content (*.md)
│   │   └── generation_pipelines/ # Pipeline definitions (*.json)
│   └── setup.sh                 # Runs schema SQL + prisma generate + seed script
│
├── server/                      # Backend (Express + Prisma)
│   ├── prisma/
│   │   └── schema.prisma        # Prisma ORM schema (must match 01_schema.sql)
│   ├── src/
│   │   ├── index.ts             # Express app entry point
│   │   ├── lib/
     │   │   │   ├── prisma.ts        # Prisma client singleton
     │   │   │   ├── checkNameUnique.ts # Cross-table name uniqueness enforcement
     │   │   │   └── resolveVariables.ts # Template variable interpolation (with 30s cache)
│   │   └── routes/
│   │       ├── projects.ts
│   │       ├── folders.ts
│   │       ├── resources.ts
│   │       ├── generationPrompts.ts
│   │       ├── systemPrompts.ts
│   │       ├── outputFormats.ts
│   │       ├── generationPipelines.ts
│   │       ├── pipelineRuns.ts   # Pipeline execution + polling
│   │       ├── generate.ts      # OpenAI integration (single generation)
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
# Database connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=slide_creator
DB_USER=slide_app
DB_PASSWORD=slide_app
DATABASE_URL="postgresql://slide_app:slide_app@localhost:5432/slide_creator?schema=public"

# OpenAI
OPENAI_API_KEY="your-openai-api-key-here"
OPENAI_MODEL="gpt-4o"
OPENAI_TEMPERATURE="0.7"

# Server
PORT=3001
```

> Only `DATABASE_URL`, the `OPENAI_*` variables, and `PORT` are read by the application. The `DB_*` variables are included as a convenience reference for the values encoded in `DATABASE_URL`.

Database admin credentials (for creating the DB, running schema scripts) are **not** stored in `.env`. They are passed directly to `psql` when running the setup script — see `database/README.md`.

---

## Database Setup

Database management uses **raw SQL scripts** in the `database/` folder — not Prisma migrations. Full setup instructions are in `database/README.md`.

| File | Purpose |
|------|---------|
| `01_schema.sql` | Drops all tables (`CASCADE`) then recreates them. Defines indexes. |
| `seed.ts` | Node.js script that reads `seeds/manifest.json` + content files, upserts via Prisma. |
| `seeds/` | Directory tree with seed content files (prompts as `.md`, pipelines as `.json`). |
| `seeds/manifest.json` | Maps each seed entry (UUID, name, metadata) to its content file path. |
| `setup.sh` | Runs `01_schema.sql` via `psql`, then `npx prisma generate`, then `npx tsx database/seed.ts`. |
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

These are global — accessible from any project. **All program resource names must be unique across all four types** (generation prompts, system prompts, output formats, generation pipelines). This allows resources to be referenced by name throughout the system — in pipeline step definitions and `{{name}}` template variables. The backend enforces cross-table uniqueness on create and update operations. Renaming a program resource triggers a user-facing warning since it may break references.

**`generation_prompts`** — prompts that instruct the LLM how to generate a presentation from source material.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | default `gen_random_uuid()` |
| name | text, not null, unique | display name (used as identifier in pipeline references) |
| content | text, not null | the prompt text (supports `{{name}}` output format variables) |
| folder | text, nullable | category/folder for grouping in tree |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |

**`system_prompts`** — system-level instructions sent to the OpenAI API as the system message.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | default `gen_random_uuid()` |
| name | text, not null, unique | display name (used as identifier in pipeline references) |
| content | text, not null | |
| folder | text, nullable | category/folder for grouping in tree |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |

**`output_formats`** — reusable format schema definitions referenced in prompts via `{{name}}` template variables. Defines the expected JSON structure for LLM output.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | default `gen_random_uuid()` |
| name | text, not null, unique | display name, also used as the template variable identifier |
| content | text, not null | the format schema definition text |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |

Prompts can reference output formats using `{{name}}` syntax (e.g., `{{Presentation schema}}`). The backend resolves these variables before sending prompts to the LLM, using the `resolveVariables()` utility in `server/src/lib/resolveVariables.ts`.

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

### Generation Pipelines

**`generation_pipelines`** — multi-step generation workflows (program-level resource).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | default `gen_random_uuid()` |
| name | text, not null, unique | display name |
| pipeline_data | jsonb, not null | pipeline definition (steps array, references prompts by name) |
| created_at | timestamptz | default `now()` |
| updated_at | timestamptz | default `now()` |

The `pipeline_data` JSON follows this schema:

```typescript
interface PipelineDefinition {
  steps: PipelineStep[];
}

interface PipelineStep {
  name: string;
  generationPrompt?: string;      // reference existing prompt by name
  generationPromptInline?: string; // OR define prompt text inline
  systemPrompt?: string;           // reference existing system prompt by name
  systemPromptInline?: string;
  sources: StepSource[];           // what data to feed this step
  saveToProject: boolean;          // persist output as a project resource
  outputNameTemplate?: string;     // supports {{project}}, {{step}}, {{timestamp}}
  isFinal?: boolean;               // marks the pipeline's final output
}

type StepSource =
  | { type: 'project_resources' }              // user-selected source files
  | { type: 'step_output'; step: number }      // output of step N (0-based)
  | { type: 'all_step_outputs' };              // all previous step outputs
```

**`pipeline_runs`** — tracks execution of a pipeline (for polling-based progress).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | default `gen_random_uuid()` |
| pipeline_id | uuid, FK → generation_pipelines | |
| project_id | uuid, FK → projects | ON DELETE CASCADE |
| status | text, not null | `'running'`, `'completed'`, `'failed'` |
| current_step | integer, not null | 0-based index of current step |
| total_steps | integer, not null | total number of steps |
| step_results | jsonb, not null | array of per-step status objects |
| output_folder_id | uuid, FK → folders, nullable | ON DELETE SET NULL |
| source_resource_ids | jsonb, not null | array of source resource UUIDs |
| final_resource_id | uuid, FK → resources, nullable | ON DELETE SET NULL |
| error | text, nullable | error message if failed |
| started_at | timestamptz | default `now()` |
| completed_at | timestamptz, nullable | |

Indexes: `idx_pipeline_runs_project` on `project_id`, `idx_pipeline_runs_status` on `status`.

### Seed Data

Seed data is stored as individual files in `database/seeds/`, managed by `database/seeds/manifest.json`, and loaded by `database/seed.ts` (a Node.js script using Prisma upserts). The manifest maps each entry's UUID, name, and metadata to a content file.

The seed script inserts:

- **Two output formats**:
  - "Presentation schema" — the SlideCreator Presentation Format v1 JSON schema
  - "Critique schema" — the SlideCreator Critique Format v1 JSON schema
- **One default generation prompt** — "Default generation prompt", uses `{{Presentation schema}}` variable
- **One default system prompt** — "Default system prompt"
- **Three pipeline generation prompts** (folder: "Pipeline") — use `{{Presentation schema}}` or `{{Critique schema}}` variables:
  - "Critique presentation"
  - "Improve from critique"
  - "Select best presentation"
- **One pipeline system prompt** (folder: "Pipeline"):
  - "Presentation critic"
- **One default generation pipeline** — "Iterative refinement pipeline" with 3 steps referencing prompts by name: Initial Draft, Critique, Improved Version

### JSON Slide Model (stored in `content_json`)

```typescript
interface PresentationData {
  _format?: string;  // e.g. "slidecreator/presentation/v1"
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
- **"Export PPTX"** button — visible when a presentation is open
- **"Present"** button — visible when a presentation is open
- **Hamburger menu** (☰, far right) — dropdown menu with app-level actions. Currently contains **Manual**, which opens an in-app quick-reference guide in a modal overlay with a PDF download option.

### Left Panel: Tree View (`TreePanel.tsx`)

A custom-built file-tree navigator. The entire sidebar is collapsible via a thin toggle strip between the sidebar and the editor (chevron button in `App.tsx`, controlled by `sidebarCollapsed` state).

The tree has two root sections, plus a project selector:

**1. Program Resources (top section, always visible regardless of selected project)**

A collapsible section containing four collapsible subsections, each with a [+] button to add new items. Generation prompts and system prompts support a `folder` field for grouping — items with the same folder value are grouped under a collapsible sub-node:
```
▶ Program Resources
  ▶ Generation Prompts      [+ button to add new]
    📄 Default generation prompt
    ▶ Pipeline/
      📄 Critique presentation
      📄 Improve from critique
      📄 Select best presentation
  ▶ System Prompts           [+ button to add new]
    📄 Default system prompt
    ▶ Pipeline/
      📄 Presentation critic
  ▶ Output Formats            [+ button to add new]
    📄 Presentation schema
    📄 Critique schema
  ▶ Generation Pipelines     [+ button to add new]
    📄 Iterative refinement pipeline
```

**2. Project selector**

A "Project" label followed by a dropdown to switch between projects, a [+] button to create new (named "Project [5-char-id]" using a base-36 timestamp), and a delete button. Separated from Program Resources by a divider.

**3. Project Resources (below, scoped to the selected project)**

A collapsible "[Project Name] - Resources" root section (using `SectionHeader` with id `project-resources`, label dynamically includes the project name). The "New folder" and "Upload file" icon buttons appear in the section header row (visible on hover via `rightActions` prop on `SectionHeader`), followed by the recursive project file tree:

```
▶ My Project - Resources  [📁+] [📤] (hover to reveal)
  ▶ Imported/
    📄 uploaded-report.md
  📄 My edited deck.json
```

**File upload** supports selecting multiple files at once. When more than one file is selected, a confirmation modal asks "Really upload X files?" before proceeding. The store provides both `uploadFile` (single) and `uploadFiles` (batch, single reload) methods. Uploaded files are automatically placed in an "Imported" folder at the project root — the folder is created on first upload if it doesn't already exist.

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

**When a presentation is selected:** the visual slide editor (described below).

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

## Generation Feature (`GenerateDialog.tsx`, `server/src/routes/generate.ts`, `server/src/routes/pipelineRuns.ts`)

### The "Generate" Button

Clicking "Generate" in the top bar opens a modal dialog. The dialog has a **mode toggle** at the top: "Single Generation" | "Pipeline".

#### Single Generation Mode

**1. Source Material Selection**
- A checklist of all resources in the current project
- File names shown with folder paths for clarity
- Select-all / Deselect-all buttons
- Resource type shown as a badge ("Source" or "Presentation")

**2. Generation Prompt Selection**
- A dropdown listing all generation prompts (grouped by folder in the dropdown labels)
- Preview of the selected prompt text (first 300 chars) below the dropdown

**3. System Prompt Selection**
- A dropdown listing all system prompts (grouped by folder in the dropdown labels)
- Preview of the selected prompt text below the dropdown

**4. Output Settings**
- **Output folder:** a dropdown of folders in the current project, plus "Project root"
- **Output name:** a text input, default: "[Project Name] - Presentation - Generated - YYMMDD:HH:MM:SS" (24-hour clock)

**5. "Generate" confirmation button** at the bottom, "Cancel" button beside it.

#### Pipeline Mode

**1. Source Material Selection** — same as single mode

**2. Pipeline Selection**
- A dropdown listing all generation pipelines
- Preview showing step count and step names (e.g., "3 steps: Initial Draft → Critique → Improved Version")

**3. Output Folder** — where saved step outputs go

**4. Pipeline Progress** — appears after clicking "Run Pipeline":
- A list of steps with status indicators (pending/running/completed/failed)
- Updated via polling (`GET /api/pipeline-runs/:id` every 2 seconds)
- On completion: loads project data, opens the final resource, closes dialog
- On failure: shows error, keeps dialog open

### Generation Process (OpenAI API)

When the user confirms generation:

1. **Frontend** sends `POST /api/generate` with:
   ```json
   {
     "projectId": "uuid",
     "sourceResourceIds": ["uuid", ...],
     "generationPromptId": "uuid",
     "systemPromptId": "uuid",
     "outputFolderId": "uuid | null",
     "outputName": "string"
   }
   ```

2. **Backend** (`server/src/routes/generate.ts`):
   - Fetches all referenced records from the database in parallel
   - Assembles the user message: each source prefixed with `=== SOURCE: [name] ===`, then the generation prompt content last
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

### Pipeline Execution Process

When a pipeline is run:

1. **Frontend** sends `POST /api/pipeline-runs` with `{ pipelineId, projectId, sourceResourceIds, outputFolderId }`.
2. **Backend** creates a `pipeline_runs` row with `status: 'running'` and returns it immediately (non-blocking).
3. **Backend** executes steps sequentially in a background async function:
   - For each step: resolves system prompt and generation prompt (by ID from DB or inline text), assembles user message from declared sources (`project_resources`, `step_output`, `all_step_outputs`), calls the OpenAI API.
   - If `saveToProject: true`, saves the response as a project resource. Auto-detects whether the response is a presentation (has `slides` array) or raw text.
   - Updates the `pipeline_runs` row after each step (current_step, step_results).
   - On error: marks the step as failed, sets `status: 'failed'` on the run, and stops.
4. **Frontend** polls `GET /api/pipeline-runs/:id` every 2 seconds to update the progress UI.
5. On completion: frontend reloads project data, opens the final resource (the step marked `isFinal`), closes the dialog.

### OpenAI API Key

- Stored in `server/.env` as `OPENAI_API_KEY`
- The frontend never sees the key — all calls go through `POST /api/generate` or `POST /api/pipeline-runs`

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
- `GET/POST /api/output-formats`, `GET/PATCH/DELETE /api/output-formats/:id`
- `GET/POST /api/generation-pipelines`, `GET/PATCH/DELETE /api/generation-pipelines/:id`

**Generation:**
- `POST /api/generate` — trigger single AI generation (see Generation Feature section)

**Pipeline Execution:**
- `POST /api/pipeline-runs` — start a pipeline run (returns run ID immediately, executes in background). Body: `{ pipelineId, projectId, sourceResourceIds, outputFolderId }`
- `GET /api/pipeline-runs/:id` — poll for pipeline run status (returns current step, step results, status)

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

Themes can be switched via the slide editor toolbar dropdown.

---

## State Management (`client/src/store/index.ts`)

Single Zustand store holding all application state:

- **Data:** `projects`, `currentProjectId`, `folders`, `resources`, `generationPrompts`, `systemPrompts`, `outputFormats`, `generationPipelines`
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
  | { type: 'output_format'; item: OutputFormat }
  | { type: 'generation_pipeline'; item: GenerationPipeline };
```

---

## API Client (`client/src/lib/api.ts`)

A thin wrapper around `fetch` with:
- Base URL: `/api` (proxied to backend via Vite dev server config)
- Automatic `Content-Type: application/json` headers
- Error extraction from response JSON
- Organized by entity: `api.projects.*`, `api.folders.*`, `api.resources.*`, `api.outputFormats.*`, `api.generationPipelines.*`, `api.pipelineRuns.*`, etc.
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
