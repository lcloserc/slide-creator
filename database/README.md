# Database Setup

This folder contains the SQL scripts that define the database schema and seed data. The scripts are the source of truth for the database structure — Prisma reads the schema at `server/prisma/schema.prisma` only to generate its TypeScript client, not to manage the database.

## Files

| File | Purpose |
|------|---------|
| `01_schema.sql` | Drops and recreates all tables, indexes, and foreign keys |
| `seed.ts` | Node.js script that reads `seeds/manifest.json` + content files, upserts via Prisma |
| `seeds/` | Directory of seed content files (prompts as `.md`, pipelines as `.json`) |
| `seeds/manifest.json` | Maps each seed entry (UUID, name, metadata) to its content file |
| `setup.sh` | Runs `01_schema.sql`, then `npx prisma generate`, then `npx tsx database/seed.ts` |

## First-Time Setup

### 1. Create the database and an app user

Connect to PostgreSQL as an admin (e.g. `postgres`):

```bash
psql -U postgres
```

Then run:

```sql
-- Create a dedicated user for the application
CREATE USER slide_app WITH PASSWORD 'slide_app';

-- Create the database
CREATE DATABASE slide_creator OWNER slide_app;

-- Grant permissions (connect as admin to the new database)
\c slide_creator
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO slide_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO slide_app;
```

Adjust the username, password, and database name to your preference.

### 2. Run the schema and seed scripts

Use `setup.sh` to apply the table structure and insert default data. Pass the admin or owner user that has permission to create/drop tables:

```bash
./database/setup.sh -U slide_app -d slide_creator
```

Or set credentials via environment variables:

```bash
PGUSER=slide_app PGPASSWORD=slide_app ./database/setup.sh -d slide_creator
```

The script uses standard `psql` authentication — it respects `PGUSER`, `PGPASSWORD`, `PGHOST`, `PGPORT`, `~/.pgpass`, and `pg_hba.conf`. No credentials are read from `server/.env`.

### 3. Configure the app

Make sure `server/.env` has a `DATABASE_URL` matching the user and database you created:

```env
DATABASE_URL="postgresql://slide_app:slide_app@localhost:5432/slide_creator?schema=public"
```

## Updating the Schema

When you change the data model:

1. **Edit `01_schema.sql`** — update the `CREATE TABLE` statements.
2. **Edit seed files** in `seeds/` and `seeds/manifest.json` if the seed data needs to change.
3. **Edit `server/prisma/schema.prisma`** — keep the Prisma models in sync with the SQL so the generated TypeScript client matches the actual tables.
4. **Run `setup.sh`** to apply:

```bash
./database/setup.sh -U slide_app -d slide_creator
```

> **Warning:** `01_schema.sql` drops all tables before recreating them. All existing data will be lost. This is fine during development. For production, you would write incremental `ALTER TABLE` migration scripts instead.

## Running the Scripts Manually

If you prefer not to use `setup.sh`, you can run the steps manually:

```bash
psql -U slide_app -d slide_creator -f database/01_schema.sql
cd server && npx prisma generate
npx tsx ../database/seed.ts
```

## CLI Reference

```
./database/setup.sh [options]

Options:
  -d, --database NAME    Database name (default: slide_creator)
  -U, --user USER        PostgreSQL user
  -h, --host HOST        PostgreSQL host
  -p, --port PORT        PostgreSQL port
  -W, --password PASS    PostgreSQL password (prefer ~/.pgpass or PGPASSWORD instead)
```
