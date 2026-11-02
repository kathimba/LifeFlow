# LifeFlow — Development Setup

This guide explains how to clone and run LifeFlow on a new development machine.

## 1. Understand what is local and what is hosted

LifeFlow has several independently managed components:

| Component | Development setup | Production |
|---|---|---|
| Next.js application and API routes | Runs locally on your PC | Vercel |
| PostgreSQL and pgvector | Can connect to the existing hosted database, or to a separate local/test database | Supabase |
| Authentication | Supabase project credentials | Supabase Auth |
| Document object storage | Cloudflare R2 credentials and bucket | Cloudflare R2 |
| Embedding service | Optional local FastAPI process | Fly.io |

Cloning the Git repository downloads tracked source files. It does **not** download ignored `.env` files, install dependencies, or copy the hosted database and stored documents.

The hosted Supabase database and R2 bucket remain hosted. A new computer only needs credentials and network access to use them.

## 2. Install prerequisites

Recommended development environment:

- Ubuntu 24.04 or another supported Linux distribution
- Node.js 22 LTS (minimum for this Next.js 16 project: Node.js 20.9)
- npm
- Python 3.11
- Git

Check installed versions:

```bash
node --version
npm --version
python3 --version
git --version
```

If Node.js is older than 20.9, upgrade it before installing the frontend dependencies.

## 3. Clone the repository

Using HTTPS:

```bash
git clone https://github.com/kathimba/LifeFlow.git
cd LifeFlow
```

Or, if your GitHub SSH key is configured:

```bash
git clone git@github.com:kathimba/LifeFlow.git
cd LifeFlow
```

Check the current branch:

```bash
git branch --show-current
git status
```

Use the branch intended for your work (for example, `develop`) rather than assuming every branch contains the same code.

## 4. Configure frontend environment variables

Create the local environment file:

```bash
cp frontend/.env.example frontend/.env.local
```

Open it in an editor:

```bash
nano frontend/.env.local
```

Fill in the values from your own Supabase and Cloudflare accounts and your intended embedding-service deployment.

### Variable reference

| Variable | Where to obtain it |
|---|---|
| `DATABASE_URL` | Supabase project database connection settings |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project API settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project API settings; use the project's anon/public key |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 API token credentials |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 API token credentials |
| `R2_ENDPOINT` | Cloudflare R2 S3-compatible endpoint |
| `R2_BUCKET_NAME` | Name of the R2 bucket |
| `EMBEDDING_SERVICE_URL` | Local FastAPI URL or deployed Fly.io service URL |

Example structure (use real values only in your uncommitted local file):

```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-public-anon-key"

R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
R2_BUCKET_NAME="your-bucket-name"

EMBEDDING_SERVICE_URL="http://localhost:8000"
```

Important:

- `DATABASE_URL` must point to the database you intend to use. Use the connection format recommended by Supabase for your environment.
- If Supabase provides both pooled and direct connection strings, follow the connection requirements of the Prisma version and deployment environment used by this project.
- `NEXT_PUBLIC_` variables are exposed to the browser. Never put private keys in variables with this prefix.
- R2 secret credentials must remain server-side. Never expose them through `NEXT_PUBLIC_` variables.
- Do not add a Supabase service-role key unless the application code is deliberately updated to use one and its security implications are reviewed.

## 5. Install frontend dependencies

```bash
cd frontend
npm install
```

If the repository has a committed `package-lock.json`, prefer `npm ci` for a reproducible clean install:

```bash
npm ci
```

Generate the Prisma client:

```bash
npx prisma generate
```

The `npm run build` script also runs `prisma generate` before `next build`.

## 6. Connect to the database safely

The Prisma schema is at:

```text
frontend/prisma/schema.prisma
```

It declares PostgreSQL and reads the connection string from `DATABASE_URL`.

A fresh clone does not need to recreate the production database. If you are using the existing Supabase project, configure the correct `DATABASE_URL` and verify connectivity.

**Do not automatically run `npx prisma db push` against the production database.** It can change the target database schema. Before any schema operation:

1. Confirm which database the connection string points to.
2. Prefer a separate development/test database for development schema changes.
3. Review the Prisma schema changes.
4. Back up important data.
5. Use the repository's established migration process and review the generated SQL before applying changes.

If the project has no migration history yet, agree on a migration strategy before introducing one. Do not create a new migration baseline or reset a database casually.

## 7. Run the FastAPI embedding service locally (optional)

The frontend calls the service using `EMBEDDING_SERVICE_URL`. For local development, set it to:

```env
EMBEDDING_SERVICE_URL="http://localhost:8000"
```

Create and activate a virtual environment:

```bash
cd ../backend
python3 -m venv .venv
source .venv/bin/activate
```

Install the declared dependencies:

```bash
pip install -r requirements.txt
```

The service imports `pypdf` in its PDF extraction endpoint, but the supplied `requirements.txt` does not currently declare it. Install it for local use:

```bash
pip install pypdf
```

Add and pin `pypdf` in `backend/requirements.txt` as a repository maintenance change so future installations include it.

Start the service:

```bash
python embedding_service.py
```

It listens on `0.0.0.0:8000`. For local development, access it at:

```text
http://localhost:8000
```

The model `all-MiniLM-L6-v2` is downloaded/cached by sentence-transformers on first use. The initial startup can take time and requires network access. Subsequent starts can use the local model cache.

### Resource note

The current `backend/requirements.txt` includes PyTorch and numerous NVIDIA/CUDA-related packages. This can make installation large and resource-intensive, particularly on a CPU-only machine with limited RAM. Do not remove or replace those pins without testing a compatible CPU-only dependency set. A separately validated CPU requirements file would make local development easier on machines without NVIDIA GPUs.

If you use the deployed Fly.io embedding service instead, do not start the local service; set `EMBEDDING_SERVICE_URL` to the deployed service's configured base URL.

## 8. Start the Next.js application

Open a terminal in `frontend/`:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:3000
```

Keep the FastAPI process running in its own terminal if `EMBEDDING_SERVICE_URL` points to localhost.

## 9. Useful commands

Run from `frontend/`:

```bash
npm run dev       # Start local Next.js development server
npm run build     # Generate Prisma client and build Next.js
npm run start     # Start the production build locally
npm run lint      # Run ESLint
npx prisma generate
npx vitest run    # Run Vitest tests
```

Run from `backend/` with the virtual environment activated:

```bash
python embedding_service.py
```

## 10. Environment-file and Git safety

The repository's `.gitignore` should exclude local environment files. Confirm:

```bash
git check-ignore frontend/.env.local
```

If the file is correctly ignored, Git prints its path. If it is not ignored, stop and correct `.gitignore` before staging or committing.

Commit example files, never real credentials:

```text
frontend/.env.example   # Safe: variable names and empty placeholders
frontend/.env.local     # Private: actual local credentials; never commit
```

If a secret is accidentally committed or pushed, removing it from the latest commit is not enough. Rotate/revoke the exposed credential with the provider, then clean the repository history if necessary.

## 11. Troubleshooting

### Prisma cannot connect

- Check that `frontend/.env.local` exists.
- Confirm `DATABASE_URL` is correct and has no accidental whitespace.
- Confirm the Supabase database is reachable from your network.
- Check whether the selected Supabase connection method is appropriate for Prisma.

### Supabase authentication fails

- Verify `NEXT_PUBLIC_SUPABASE_URL`.
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Check the Supabase Auth redirect URL configuration for `http://localhost:3000` during local development.

### Document upload fails

- Verify the R2 endpoint, bucket name, access key, and secret.
- Confirm the R2 token has the required permissions for the bucket.
- Keep R2 credentials on the server; do not expose them to browser code.

### AI/semantic search fails

- Confirm `EMBEDDING_SERVICE_URL` is reachable.
- If running locally, verify the FastAPI process is listening on port 8000.
- Allow time for the model to download on first startup.
- Check the FastAPI process output for model-loading or request errors.

### PDF text extraction fails

- Confirm `pypdf` is installed in the active Python environment.
- Confirm the uploaded file is a valid PDF and the request uses the expected multipart file field.

## 12. Before opening a pull request

```bash
cd frontend
npm run lint
npx vitest run
npm run build
```

Then review the Git changes:

```bash
cd ..
git status
git diff --check
git diff
```

Never include `.env.local`, database credentials, R2 secrets, or production data in a commit.
