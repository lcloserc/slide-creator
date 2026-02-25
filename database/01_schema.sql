-- SlideCreator database schema
-- Safe to re-run: drops and recreates all tables.
-- WARNING: This will destroy all existing data.

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS folders CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS slide_templates CASCADE;
DROP TABLE IF EXISTS system_prompts CASCADE;
DROP TABLE IF EXISTS generation_prompts CASCADE;

-- Also drop the Prisma migration tracking table so
-- Prisma considers the DB fresh on next `prisma migrate dev`
DROP TABLE IF EXISTS _prisma_migrations CASCADE;

------------------------------------------------------------
-- Program-level resources (global, shared across projects)
------------------------------------------------------------

CREATE TABLE generation_prompts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE system_prompts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE slide_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    template_data   JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

------------------------------------------------------------
-- Projects
------------------------------------------------------------

CREATE TABLE projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

------------------------------------------------------------
-- Folders (nested tree within a project)
------------------------------------------------------------

CREATE TABLE folders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id   UUID REFERENCES folders(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_folders_project ON folders(project_id);
CREATE INDEX idx_folders_parent  ON folders(parent_id);

------------------------------------------------------------
-- Resources (files within a project)
------------------------------------------------------------

CREATE TABLE resources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    folder_id       UUID REFERENCES folders(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    resource_type   TEXT NOT NULL,          -- 'source_file' | 'presentation'
    content_text    TEXT,                    -- raw text (source files, prompts)
    content_json    JSONB,                  -- JSON slide model (presentations)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resources_project ON resources(project_id);
CREATE INDEX idx_resources_folder  ON resources(folder_id);
