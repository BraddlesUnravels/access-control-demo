# AGENTS

## Project purpose

Build a small, functional mini-LMS technical assessment using:

- Next.js (App Router)
- TypeScript
- Supabase (`supabase-js`, `supabase-ssr`)
- PostgreSQL (via Supabase)

The goal is to demonstrate solid full-stack implementation quality, secure access control, and clear architecture decisions under a strict deadline.

## Time constraint

This project is time-boxed to approximately 1.5 days (within a 48-hour submission window).

Priority is:

1. Complete required functionality end-to-end
2. Keep implementation understandable and defensible in interview
3. Avoid unnecessary complexity and refactors

## Build constraints

- Do not over-engineer.
- Do not introduce non-required architecture layers unless they clearly reduce risk.
- Prefer APIs/route handlers over adding new action-heavy patterns.
- Use simple, consistent patterns that can be explained quickly.
- Keep UI basic and minimal. UI polish is the least priority compared to backend correctness and security.

## Required feature scope (no extras until done)

1. Authentication (sign up, login, logout)
2. Student dashboard listing own consultations
3. Consultation create form:
   - First name
   - Last name
   - Reason
   - Datetime
4. Student can:
   - Mark complete/incomplete
   - Reschedule
   - Cancel
5. Admin can view all consultations (read-only is acceptable)
6. README with setup, assumptions, design choices, schema/migrations summary

## Decision guardrails

Before implementing anything non-trivial, ask:

1. Is this required by the assessment?
2. Will this increase completion risk inside the timebox?
3. Can I explain this decision clearly in 60 seconds?

If any answer is “no”, choose the simpler option.

## Security and access control baseline

- Enforce ownership: students can only access their own consultations.
- Enforce admin role check for all-consultations view.
- Keep validation and authorization checks explicit and close to API boundaries.
- Treat backend/API route security as a top priority and non-negotiable.
- Do not trust client-side checks for authorization; enforce access at server boundaries.
- Prefer clear, explicit auth/ownership checks in each protected route over implicit patterns.

## Agent handoff checklist (quick-start)

Use this when handing to another agent so they can continue without re-discovery.

1. Confirm required flows status:
   - Auth: signup, login, logout
   - Student dashboard: list own consultations
   - Consultation create: first name, last name, reason, datetime
   - Student actions: complete/incomplete, reschedule, cancel
   - Admin view all consultations (read-only acceptable)
2. Verify security on every API route touching consultations:
   - Student can only read/update/delete own records
   - Admin-only access for global/all-consultations endpoints
   - Validation and authorization checks occur at route boundary
3. Keep implementation simple:
   - Prefer straightforward route handlers
   - Avoid extra architecture that does not directly reduce risk
4. Keep UI minimal:
   - Functional screens/forms only
   - No cosmetic polish until required flows are fully complete
5. Update README before handoff completion:
   - Setup steps
   - Assumptions
   - Schema/migrations summary
   - Design tradeoffs and what to improve with more time

## Recommended validation runbook

Run these before declaring done (adjust based on available scripts):

1. Install and project checks:
   - `npm install` (or package manager in repo)
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
2. Manual flow validation:
   - Signup/login/logout works
   - Student can create and manage only own consultations
   - Admin can view all consultations
   - Unauthorized access attempts are denied
3. Final pass:
   - Re-check for obvious authorization gaps in API routes
   - Ensure README reflects actual implemented behavior

## Definition of done

- All required flows work locally.
- No obvious authorization gaps.
- README clearly explains tradeoffs and what would be improved with more time.
- Submission is stable, coherent, and interview-defensible.
