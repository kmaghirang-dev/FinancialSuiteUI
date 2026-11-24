# FinancialSuite UI

Web UI for the **FinancialSuite** ASP.NET Core API (`D:/Codes/Personal/FinancialSuite/API`), built on the Sakai (PrimeReact) Next.js template and replicated from MyPersonalApp Admin UI v1.

## Modules

| Menu | Page | API route |
| --- | --- | --- |
| Dashboard | `/` | credit card overview plus counts from every module |
| Credit Card Tracker | `/credit-card-overview`, `/credit-card-analysis`, `/credit-cards`, `/credit-cards/[id]` | `api/credit-cards`, `api/credit-card-statements`, `api/credit-card-payments` |
| Organizer | `/projects`, `/media-library` | `api/projects`, `api/media-library` |
| Administration | `/dropdowns`, `/user-roles` | `api/dropdown/...`, `api/identity/userRole` |
| Account | `/profile`, `/login` | ASP.NET Identity endpoints under `api/identity` |

## Colour scheme: "Ledger" navy & gold

| Token | Hex | Used for |
| --- | --- | --- |
| `--app-brand-500` (primary) | `#2b5d9b` | buttons, links, active states |
| `--app-brand-700` | `#1d4177` | hover, chart lines, menu headings |
| `--app-brand-900` | `#132b4f` | headings, large values, logo tile |
| `--app-brand-50/100` | `#f4f7fb` / `#e3eaf5` | page background, table headers, chips |
| `--app-gold-500` | `#c9a227` | accents only: active menu marker, login card edge, logo |
| `--app-gold-100/700` | `#f8f0d8` / `#8a6d12` | dashboard stat icons |

Navy reads as trust and stability, gold as value; gold is kept to small accents so it never competes with the primary. Debt colours keep their meaning: green = debt went down, red = debt went up.

## Getting started

1. Start the API with its `https` launch profile (https://localhost:7265).

    The API has no CORS policy, so this UI proxies `/api/*` to it (see `next.config.js`).

2. Export the API's development certificate so Node trusts it (once per machine, and again whenever `dotnet dev-certs https` renews it). In PowerShell, from this folder:

    ```powershell
    $cert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.FriendlyName -eq 'ASP.NET Core HTTPS development certificate' } | Sort-Object NotAfter -Descending | Select-Object -First 1
    New-Item -ItemType Directory -Force certs | Out-Null
    "-----BEGIN CERTIFICATE-----`n$([Convert]::ToBase64String($cert.RawData, 'InsertLineBreaks'))`n-----END CERTIFICATE-----" | Out-File -Encoding ascii certs\aspnet-dev-cert.pem
    ```

    Only the public certificate is exported. `npm run dev` and `npm start` pass it to Node via `NODE_EXTRA_CA_CERTS` (Windows `set` syntax).

3. Install and run the UI:

    ```bash
    npm install
    npm run dev
    ```

4. Open http://localhost:3000 and sign in with an account seeded by the API (`UsersSeeder`). The FinancialSuite API and the MyPersonalApp API both use https://localhost:7265, so run one at a time (or change `API_URL`).

Set `API_URL` in `.env` (or `.env.local`) if the API runs elsewhere. To use the API's `http` profile instead, set `API_URL=http://localhost:5138`; the certificate is then not needed.

## Structure

| Path | Purpose |
| --- | --- |
| `app/(full-page)/login` | Sign-in page (ASP.NET Identity bearer tokens) |
| `app/(main)/*` | Admin pages, one folder per API feature |
| `app/components/crud/CrudPage.tsx` | Generic list/create/view/edit/toggle/delete page |
| `app/components/crud/FormField.tsx` | Field renderer used by every entity form |
| `app/services/api-client.ts` | `fetch` wrapper: bearer token, refresh on 401, API error messages |
| `app/services/http-service.ts` | `createService(endpoint)` with the API's CRUD conventions |
| `app/services/*.service.ts` | One service per API feature, with request/response types |
| `app/hooks/usePagedData.ts` | Server-side paging, sorting and search for tables |
| `layout/` | Topbar, sidebar menu and layout shell |
| `styles/layout/_template-custom.scss` | Navy & gold look and feel |
| `public/themes/financial-navy` | PrimeReact theme (lara-light-green recoloured to navy) |

## Adding an entity

1. Add `app/services/<entity>.service.ts` using `createService('<route>')`, exposing only the operations the controller supports.
2. Add `app/(main)/<entity>/page.tsx` that renders `CrudPage` with columns (set `sortField` to the API's allowed `SortBy` names), a zod schema mirroring the command validators, and form fields.
3. Add a menu entry in `layout/AppMenu.tsx`.

`CrudPage` shows create, edit, enable/disable and delete only when the service implements `create`, `update`, `toggle` and `delete`.
