# Documentation index

This repo keeps its documentation in a few focused domains so readers can jump straight to the area they need.

## Start here

If you want the fastest path:

1. Read this index.
2. Follow the setup instructions in [development.md](development.md).
3. Review the access-control and architecture docs before changing auth or database code.

## Documentation map

| Area           | What it covers                                                | Start here                                     |
| -------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| Overview       | project purpose, quick-start, demo accounts, walkthrough      | [../README.md](../README.md)                   |
| Access control | invite gate, auth, roles, permissions, consultation lifecycle | [access-control.md](access-control.md)         |
| API            | HTTP route contract and response behavior                     | [api.md](api.md)                               |
| Architecture   | request flow and system boundaries                            | [architecture.md](architecture.md)             |
| Development    | local setup, environment, scripts, MailPit                    | [development.md](development.md)               |
| Testing        | test layers and commands                                      | [testing.md](testing.md)                       |
| Secrets        | secret separation and rotation                                | [secrets-management.md](secrets-management.md) |
| Deployment     | Azure, Key Vault, and GitHub OIDC                             | [deployment.md](deployment.md)                 |

## Recommended reading order

- New contributors: overview + development + architecture
- Auth and RBAC review: access-control + api + architecture
- Deployment and ops: secrets-management + deployment
- Test and validation: testing

## Important note

Security is intentionally documented at multiple layers. The UI may hide controls, but the real authorization boundaries are:

- route handlers;
- Supabase Auth and app roles;
- PostgreSQL row-level security;
- the database-backed consultation lifecycle.

A feature is not considered complete if it is only hidden in the client.
