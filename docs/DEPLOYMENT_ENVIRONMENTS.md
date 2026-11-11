# Deployment Environments

`main` is the production source branch. `staging` is the pre-production source branch for the staging Render backend and Vercel frontend. This fix does not modify provider settings, databases, or deployment configuration.

## Vercel environment variables

The build uses `VITE_DEPLOYMENT_ENV` as the explicit deployment target because Vercel reports `VERCEL_ENV=production` for both a production deployment and a separate staging Vercel project configured with its own Production environment. `VERCEL_ENV` is still validated for Vercel builds, but it is not sufficient to identify the Admiino environment.

Production Vercel project, Production environment, Git branch `main`:

```text
VITE_DEPLOYMENT_ENV=production
VITE_API_BASE_URL=https://admiino-backend.onrender.com/api/v1
VITE_MCP_SERVER_URL=https://admiino-backend.onrender.com/mcp   # optional; omit to derive safely
```

Staging Vercel project, Production environment, Git branch `staging`:

```text
VITE_DEPLOYMENT_ENV=staging
VITE_API_BASE_URL=https://admiino-backend-staging.onrender.com/api/v1
VITE_MCP_SERVER_URL=https://admiino-backend-staging.onrender.com/mcp   # optional; omit to derive safely
```

If staging is a Preview deployment in the production Vercel project, use the same staging values in that project's Preview environment; Vercel will report `VERCEL_ENV=preview`. Never set production API or MCP URLs in staging. The validator rejects missing variables, malformed URLs, mismatched API/MCP hosts, query strings, credentials, and production URLs in staging.

Before production release, test the backend/frontend pair from `staging`, complete security and end-to-end checks, obtain approval, and promote through reviewed pull requests. Confirm provider branch settings independently so staging cannot deploy to production.
