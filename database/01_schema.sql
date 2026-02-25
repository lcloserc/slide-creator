-- SlideCreator database schema
-- Safe to re-run: drops and recreates all tables.
-- WARNING: This will destroy all existing data.

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS pipeline_runs CASCADE;
DROP TABLE IF EXISTS generation_pipelines CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS folders CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS output_formats CASCADE;
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
    name        TEXT NOT NULL UNIQUE,
    content     TEXT NOT NULL,
    folder      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE system_prompts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    content     TEXT NOT NULL,
    folder      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE output_formats (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
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

------------------------------------------------------------
-- Generation Pipelines (program-level, multi-step generation)
------------------------------------------------------------

CREATE TABLE generation_pipelines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL UNIQUE,
    pipeline_data   JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

------------------------------------------------------------
-- Pipeline Runs (execution tracking for polling)
------------------------------------------------------------

CREATE TABLE pipeline_runs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id         UUID NOT NULL REFERENCES generation_pipelines(id),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status              TEXT NOT NULL DEFAULT 'running',
    current_step        INTEGER NOT NULL DEFAULT 0,
    total_steps         INTEGER NOT NULL,
    step_results        JSONB NOT NULL DEFAULT '[]'::jsonb,
    output_folder_id    UUID REFERENCES folders(id) ON DELETE SET NULL,
    source_resource_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    final_resource_id   UUID REFERENCES resources(id) ON DELETE SET NULL,
    error               TEXT,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_pipeline_runs_project ON pipeline_runs(project_id);
CREATE INDEX idx_pipeline_runs_status  ON pipeline_runs(status);
