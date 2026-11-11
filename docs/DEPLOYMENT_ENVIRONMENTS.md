# Deployment Environments

`main` is the production source branch. `staging` is the pre-production source branch intended for a separate Render backend and Vercel frontend deployment. This workflow does not modify Render, Vercel, environment variables, databases, or deployment branch settings.

Test the backend/frontend pair from `staging`, complete security and end-to-end checks, obtain approval, and promote through reviewed pull requests. Confirm provider branch settings independently so staging cannot deploy to production.

GitHub branch protection is an external control and is not claimed active here. Repository administrators must configure `main` protection on both hosting repositories: pull requests, reviews where supported, reliable required checks, no force pushes, no deletion, and restricted bypass permissions.
