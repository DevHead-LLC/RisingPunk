### CURRENT TASK: Financial Statements Overlay

Progress
- Balance component now opens a Financial Statements overlay with three tabs and a close button.

### Objectives
- Ensure financial statements overlay matches app style while leaning slightly professional.
- Tabs on left: Income Statement, Balance Sheet, Statement of Cash Flows. Each shows a prepared placeholder area for future data.
- Close button top-right; opening/closing preserves the underlying view.
- Show active career tier title in each tab (e.g., Barista (Tier 1)).
- Balance Sheet must only show real assets/liabilities: for now, only Cash as an asset; liabilities none. Use current user wallet balance for existing users; use $1000 starting cash for new users.
- Default tier for all users (until choice UI exists): `barista`.

### Constraints
- Follow `intended.md` general styling expectations; do not alter unrelated battle systems.
- Avoid new sources of truth; reuse existing `ui` slice for modal control.

### Plan (step-by-step)
1) UI/State
- Use `ui.modals.financialStatements` to control visibility; open from `Balance` tap; close via overlay's `CloseButton`.

2) Layout & Styling
- Left-side vertical tabs; content panel on the right; top-right reusable close button; respect theme `COLORS`/`SIZING`.

3) Content Structure (placeholders only)
- Income Statement: Revenue → COGS → Gross Profit → Operating Expenses → Operating Income → Other → Taxes → Net Income.
- Balance Sheet: Assets (current/non-current) → Liabilities (current/long-term) → Equity (paid-in, retained earnings).
- Cash Flows: Operating → Investing → Financing → Net change in cash.

4) Backend Data & Endpoints
- Collections:
  - `finance_tier_templates` (global, immutable): base data for all users.
  - `financial_tiers` (per-user overrides): only user-changed fields or full copies.
- Models:
  - `FinanceTemplate` (templates) and `FinanceTier` (user overrides) with tierKey, tierName, story, incomeStatement, balanceSheet, cashFlows.
- Endpoints:
  - GET `/api/users/finance/templates` → list global templates.
  - GET `/api/users/finance/tiers` → list user overrides.
  - GET `/api/users/finance/tiers/:tierKey` → single user override.
- Seeding:
  - Seed three templates (barista, graphic_designer, corporate_lawyer) into `finance_tier_templates`.
  - Optionally pre-materialize user copies in `financial_tiers` (not required; overrides created on change).
  - Update existing templates to remove non-cash balance sheet items (set `balanceSheet.assets = {}` and `balanceSheet.liabilities = {}`; `netWorthChange = 0`).

5) Client Rendering Rules
- Default tier selection: barista if present; later allow user selection.
- Income Statement and Cash Flows: render from template/overrides data.
- Balance Sheet: ignore template asset/liability lists for now; render:
  - Assets: `Cash Balance` = current user wallet (from `balanceSlice.total`).
  - Liabilities: `None` ($0.00).
  - Net Worth (Cash) = current wallet.

### Deliverables
- Financial Statements overlay with left tabs, top-right close, and placeholders for each statement; opened from tappable balance.
- Server endpoints available for finance templates and per-user overrides; templates seeded with three tiers.
