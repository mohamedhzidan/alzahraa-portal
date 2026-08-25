# Alzahraa Portal Recovery Status

Branch: `codex/recovery-2026-08-23`

This branch is an isolated recovery branch. It is **not** the live production branch and must not be merged until the checks below pass.

## Verified against current `main`

- The current production repository still contains a nested legacy demo portal under `alzahraa-portal/`.
- That legacy copy exposes demo-login language and the shared password `1234`.
- Canonical production code lives under `assets/` and root `index.html`.
- `assets/js/store.js` still has an all-or-nothing startup path: one failed table load can make the entire workspace fall back to offline mode.
- Normal `Store.create`/`Store.save`/`Store.destroy` calls are optimistic and return before Supabase confirms the write.
- The generic entity form therefore can close and show `Saved` before the server has accepted a write.
- The current generic entity form does not expose a separate `Save draft` action.
- SQL migrations and Edge Function source are not currently version-controlled in this GitHub repository.
- The repository has duplicate root JavaScript copies in addition to the canonical `assets/js` tree.

## Earlier isolated recovery work recorded in the supplied handoff

The previous recovery session reported an isolated test build where:

- 12/12 source/accounting/save/draft/import tests passed.
- A simulated migration covered 57/57 application modules.
- Browser and SQL permissions matched all 18 roles.
- Workflow separation, reversal, project/site scoping, import rollback, attachment access and HR/payroll privacy passed isolated tests.

Those repairs were **not pushed to GitHub**, so this branch must reconstruct and re-verify them instead of assuming they exist.

## Recovery order

1. Add CI that blocks syntax errors, missing assets, public demo credentials and private credentials.
2. Remove the nested legacy demo portal and misleading duplicate public files from this recovery branch.
3. Repair remote startup so an unavailable table does not silently turn the whole portal into an offline workspace.
4. Make ordinary online saves server-confirmed; keep forms open and preserve user input on rejection.
5. Add an explicit encrypted offline `Save draft` action.
6. Restore safe lookup-only loading for dropdown/reference data.
7. Restore atomic imports and validation.
8. Repair attachment load/upload/locking behavior.
9. Align browser permissions with the database permission matrix and fail closed for project/site scope.
10. Restore workflow/RLS migration source, including the two incomplete HR workflows.
11. Restore and audit the four Edge Functions: login, password change, account administration and AI assistant.
12. Re-run accounting/report calculation regression tests.
13. Run source/security checks and a private preview.
14. Open a draft PR to `main`; do not merge until production deployment steps and Supabase migration are reviewed.

## Security scan status

The Codex Security skill is available as guidance in this ChatGPT session, but the actual hosted deep-scan execution action is not exposed here. Therefore no official Codex Security deep scan is being claimed. Repository security review and regression checks must be labeled manual/CI unless the hosted deep-scan tool becomes available.

## Live-system rule

Do not run unverified SQL against the live Supabase project and do not merge this branch into `main` until the migration, Edge Functions, browser behavior and role matrix have all been revalidated.
