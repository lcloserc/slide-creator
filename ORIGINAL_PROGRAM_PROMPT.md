
******* This is for reference. Should not be edited by AI. *******

# Prompt: Build a Slide Editor with AI Generation, Projects, and PPTX Export

## Overview

Build a full-stack web application for creating, editing, and generating presentation slide decks. The application is organized around **projects** — each project holds source files, generated presentations, and edited presentations. A set of **program-level resources** (generation prompts, system prompts, and slide templates) are shared across all projects.

Users can:
- Upload source material (any text-based file) into a project
- Generate presentations from source material using the OpenAI API
- Edit generated presentations visually in a structured slide editor
- Export presentations to PowerPoint (.pptx) with native editable text and tables
- Organize everything in a tree view with folders

**Stack:** React + Vite frontend, Node.js + Express backend, PostgreSQL database, PptxGenJS for PPTX export, OpenAI API for generation.

---

## Data Model (PostgreSQL)

### Program-Level Resources

These are global — accessible from any project.

**`generation_prompts`** — prompts that instruct the LLM how to generate a presentation from source material.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| name | text, not null | display name |
| content | text, not null | the prompt text |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**`system_prompts`** — system-level instructions sent to the OpenAI API as the system message.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| name | text, not null | |
| content | text, not null | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**`slide_templates`** — reusable presentation templates (stored as the JSON slide model, representing a starting structure and theme).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| name | text, not null | |
| template_data | jsonb, not null | JSON slide model (theme + slide structure) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### Projects and Resources

**`projects`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| name | text, not null | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**`folders`** — supports nested folder structure within a project's tree.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| project_id | uuid, FK → projects | |
| parent_id | uuid, FK → folders, nullable | null = root level |
| name | text, not null | |
| sort_order | integer | position within parent |
| created_at | timestamptz | |

**`resources`** — every file in a project: uploaded source files, generated presentations, edited presentations.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| project_id | uuid, FK → projects | |
| folder_id | uuid, FK → folders, nullable | null = project root |
| name | text, not null | file name displayed in tree |
| resource_type | text, not null | `'source_file'`, `'presentation'` |
| content_text | text, nullable | raw text content (for source files, prompts) |
| content_json | jsonb, nullable | JSON slide model (for presentations) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

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

### Top Bar

- Application name / logo (left)
- Current project name (editable inline)
- **"Generate"** button — prominent, primary-colored, always visible. Opens the generation settings dialog.
- **"Export PPTX"** button — visible when a presentation is open in the editor
- **"Present"** button — visible when a presentation is open in the editor

### Left Panel: Tree View

A file-tree navigator showing all resources. The tree has two root sections:

**1. Program Resources (top section, always visible regardless of selected project)**
```
📁 Program Resources
  📁 Generation Prompts
    📄 Default generation prompt
    📄 Summary-style prompt
    ...
  📁 System Prompts
    📄 Default system prompt
    ...
  📁 Slide Templates
    📄 Dark theme template
    📄 Light theme template
    ...
```

**2. Project Resources (below, scoped to the selected project)**
```
📁 [Project Name]
  📁 Source Material
    📄 uploaded-report.md
    📄 meeting-notes.txt
  📁 Generated
    📄 Presentation v1
    📄 Presentation v2
  📄 My edited deck
```

**Tree interactions:**
- Click a resource to open it in the editor panel (right)
- Right-click context menu: rename, delete, move to folder, duplicate
- Drag and drop to move resources between folders
- "New folder" button and "Upload file" button at the top of the project section
- A project selector dropdown above the project tree (to switch between projects, create new project, delete project)

### Center/Right Panel: Editor

The editor panel changes based on what is selected in the tree:

**When a source file is selected:** show a full-height text editor (a `<textarea>` or a code editor component like CodeMirror) for viewing and editing the raw text. Auto-saves on change (debounced).

**When a generation prompt, system prompt is selected:** same text editor view — these are editable text documents.

**When a slide template or presentation is selected:** show the visual slide editor (described below).

---

## Slide Editor (for presentations and templates)

### Layout (within the editor panel)

1. **Slide thumbnail sidebar:** vertical strip of miniature slide previews. Click to select, drag to reorder. Buttons: add slide, delete slide, duplicate slide.

2. **Slide canvas:** the selected slide rendered at large size. Title and all content blocks are directly editable in place using `contenteditable` elements. A floating toolbar appears on block focus.

3. **Editor toolbar (above canvas):** theme selector dropdown, slide notes toggle.

### Editing Behavior

- **Title:** a single `contenteditable` heading mapped to `slide.title`.
- **Text block:** `contenteditable` div. Inline bold (`Ctrl+B`) and italic (`Ctrl+I`). Enter creates a new text block below.
- **Bullet/numbered list:** each item is a `contenteditable` div. Enter adds item, Backspace on empty removes it. Tab to indent (max 2 levels).
- **Table:** HTML `<table>` with `contenteditable` cells. Tab moves between cells. Toolbar to add/remove rows and columns.
- **Quote:** styled `contenteditable` div with a left accent border.
- **Block toolbar (floating):** add block (choose type), delete, move up/down, convert type.
- **Auto-save:** every edit updates the JSON slide model and persists to the database (debounced, ~1 second).

---

## Generation Feature

### The "Generate" Button

Clicking "Generate" opens a settings dialog with the following options:

**1. Source Material Selection**
- A checklist of all resources in the current project's tree (source files and existing presentations)
- The user checks which resources to include as source material
- Show file names with folder paths for clarity
- Allow select-all / deselect-all

**2. Generation Prompt Selection**
- A dropdown listing all generation prompts from the program-level resources
- Preview of the selected prompt text below the dropdown
- The user picks one

**3. System Prompt Selection**
- A dropdown listing all system prompts from the program-level resources
- Preview of the selected prompt text below the dropdown
- The user picks one

**4. Slide Template Selection (optional)**
- A dropdown listing all slide templates, plus a "None" option
- If selected, the template's theme and structure are included in the prompt as a formatting reference

**5. Output Settings**
- **Output folder:** a folder picker showing the current project's tree. The generated presentation will be saved here.
- **Output name:** a text input for the name of the generated presentation resource. Default: "Generated — [timestamp]"

**6. "Generate" confirmation button** at the bottom of the dialog.

### Generation Process (OpenAI API)

When the user confirms generation:

1. **Assemble the API request.** Build the messages array for the OpenAI Chat Completions API:

   - **System message:** the content of the selected system prompt.
   - **User message:** a concatenation of:
     1. The content of each selected source file, each preceded by a header like `=== SOURCE: [filename] ===` and followed by a blank line.
     2. If a slide template is selected, include it as: `=== SLIDE TEMPLATE (use this structure and theme as a reference) ===` followed by the template JSON serialized as a readable format.
     3. The content of the selected generation prompt, placed last so it acts as the final instruction.

2. **Call the OpenAI API** from the backend (POST to `https://api.openai.com/v1/chat/completions`):
   - Model: configurable via environment variable (`OPENAI_MODEL`, default `gpt-4o`)
   - The generation prompt should instruct the model to return a valid JSON object matching the `PresentationData` schema (the same JSON slide model used throughout the app). Include the schema definition in the prompt so the model knows the exact format.
   - Set `response_format: { type: "json_object" }` to enforce JSON output.
   - Temperature: configurable via environment variable (`OPENAI_TEMPERATURE`, default `0.7`)

3. **Handle the response:**
   - Parse the returned JSON into a `PresentationData` object.
   - Validate it has the expected structure (slides array, blocks with valid types). If parsing fails, show an error to the user with the raw response for debugging.
   - Save as a new resource in the database with `resource_type: 'presentation'`, placed in the selected output folder with the specified name.
   - Open the new presentation in the slide editor automatically.

4. **UI during generation:**
   - Show a progress indicator (spinner + "Generating..." text) in the dialog.
   - Disable the Generate button while a request is in flight.
   - Show estimated wait time if possible, or just an indeterminate spinner.
   - On success: close the dialog and open the presentation.
   - On error: show the error message in the dialog, keep it open so the user can retry.

### OpenAI API Key

- Stored as an environment variable on the backend (`OPENAI_API_KEY`).
- The frontend never sees or handles the API key.
- All OpenAI API calls go through a backend endpoint (e.g., `POST /api/generate`) that proxies the request.

---

## Backend API (Node.js + Express)

### Endpoints

**Projects:**
- `GET /api/projects` — list all projects
- `POST /api/projects` — create a project
- `PATCH /api/projects/:id` — rename a project
- `DELETE /api/projects/:id` — delete a project and all its resources

**Folders:**
- `GET /api/projects/:projectId/folders` — list folders in a project
- `POST /api/projects/:projectId/folders` — create a folder
- `PATCH /api/folders/:id` — rename or move a folder
- `DELETE /api/folders/:id` — delete a folder and its contents

**Resources:**
- `GET /api/projects/:projectId/resources` — list resources in a project (flat or tree)
- `POST /api/projects/:projectId/resources` — create a resource (upload or create empty)
- `GET /api/resources/:id` — get a single resource with its content
- `PATCH /api/resources/:id` — update a resource (name, content, folder)
- `DELETE /api/resources/:id` — delete a resource

**Program-Level Resources:**
- `GET /api/generation-prompts` — list all
- `POST /api/generation-prompts` — create
- `GET /api/generation-prompts/:id` — get one
- `PATCH /api/generation-prompts/:id` — update
- `DELETE /api/generation-prompts/:id` — delete
- Same pattern for `/api/system-prompts` and `/api/slide-templates`

**Generation:**
- `POST /api/generate` — trigger a generation. Request body:
  ```json
  {
    "projectId": "uuid",
    "sourceResourceIds": ["uuid", "uuid"],
    "generationPromptId": "uuid",
    "systemPromptId": "uuid",
    "slideTemplateId": "uuid | null",
    "outputFolderId": "uuid | null",
    "outputName": "string"
  }
  ```
  Response: the created resource object (with the generated presentation data).

**File Upload:**
- `POST /api/projects/:projectId/upload` — multipart file upload. Reads the file content as text, creates a resource with `resource_type: 'source_file'`.

### Database

- Use **PostgreSQL** with a migration tool (e.g., `node-pg-migrate`, `knex`, or `prisma`).
- Provide migration files that create all tables.
- Seed the database with sensible defaults:
  - One default generation prompt that instructs the LLM to produce a presentation in the JSON slide model format, with clear instructions on structure, slide count, and block types.
  - One default system prompt (e.g., "You are a presentation design assistant. You create clear, well-structured slide decks from source material.").
  - Two default slide templates: one dark theme, one light theme.

---

## Export to PPTX

Use **PptxGenJS** (`pptxgenjs`) on the frontend to generate a native, editable PowerPoint file from the JSON slide model.

Mapping from the data model to PptxGenJS:

- `theme` → slide dimensions 16:9 (13.333 × 7.5 inches), background color on every slide.
- `Slide.title` → `slide.addText()` at top of slide, theme title color, 28–32pt.
- `Block type: "text"` → `slide.addText()`. Parse inline bold/italic into PptxGenJS text runs with `bold: true` / `italic: true`.
- `Block type: "bullets"` → `slide.addText()` with `bullet: true` per item.
- `Block type: "numbered"` → `slide.addText()` with `bullet: { type: 'number' }`.
- `Block type: "table"` → `slide.addTable()` with styled header row (bold, accent background).
- `Block type: "quote"` → `slide.addText()` with background fill and italic.
- `Slide.notes` → `slide.addNotes()`.

Blocks stack vertically below the title. Approximate spacing: text/quote ~0.5" per line, bullets ~0.35" per item, table ~0.4" per row.

Export triggers a browser download of the `.pptx` file.

---

## Presentation Mode

Full-screen slideshow:

- Renders slides one at a time, same HTML/CSS as the editor but read-only, scaled to fill viewport.
- Arrow keys / click to navigate.
- Escape to exit.
- Speaker notes overlay toggled with `N` key.

---

## Theming

4 built-in theme presets:

1. **Dark** — #1A1A2E background, #4EC9B0 accent, white text
2. **Light** — white background, dark text, #2563EB accent
3. **Warm** — #FFF8F0 background, dark brown text, #E67E22 accent
4. **Midnight** — #0D1117 background, #58A6FF accent, light gray text

Themes apply globally to all slides in a presentation. Defined as CSS custom properties for instant switching. PPTX export reads the same theme values.

Users can also create custom themes via the slide template system.

---

## Technical Requirements

- **Frontend:** React 18+ with Vite, TypeScript
- **Backend:** Node.js + Express, TypeScript
- **Database:** PostgreSQL
- **ORM / query builder:** Prisma or Knex (pick one, be consistent)
- **Styling:** Tailwind CSS
- **State management:** Zustand or React context + useReducer
- **PPTX generation:** `pptxgenjs` (latest, client-side)
- **AI generation:** OpenAI Chat Completions API (called from backend)
- **File upload:** multer (backend), File API (frontend)
- **Tree view:** a component library (e.g., `react-arborist`) or custom built with drag-and-drop via `@dnd-kit`
- **Unique IDs:** `crypto.randomUUID()` (frontend) and `gen_random_uuid()` (PostgreSQL)
- **Environment variables:** `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TEMPERATURE`, `DATABASE_URL`

---

## Non-Goals (out of scope)

- No image/media support in slides (text and tables only)
- No animations or slide transitions
- No collaborative editing or real-time multi-user
- No free-form positioning (structured block model only)
- No PDF export (PPTX only)
- No user authentication (single-user application)

---

## Quality Expectations

- The slide editor should feel responsive — edits reflect instantly, auto-save is invisible.
- The PPTX output must have real editable text and tables, not images.
- The tree view should handle dozens of resources smoothly — fast expand/collapse, drag-and-drop without jank.
- The generation dialog should be clear and easy to use — no ambiguity about what will be sent to the API.
- Handle edge cases: empty slides, long text, wide tables, malformed LLM responses, empty projects, missing prompts.
- The UI should be clean and modern with adequate spacing, clear visual hierarchy, and readable typography.
- Works in modern Chrome, Firefox, and Safari.
