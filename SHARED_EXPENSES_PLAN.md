# Shared Expenses - Design Plan

Goals:
- Allow a user to link a partner via email with reciprocity (both sides consent).
- Show combined expenses; later support equal/weighted splits and settle-up.
- Preserve privacy (only emails used for linkage).

API:
- POST `/api/shared/expenses` { partnerEmail?: string } → set/clear partner.
- GET `/api/shared/expenses` → { expenses: TransactionRecord[], partner: string|null } (reciprocal only).
- Future: POST `/api/shared/settle`.

Data:
- `keys.sharedPartnerEmail(userId)` holds partner email (lowercased).
- Transactions remain per-user; reads combine when reciprocal.

UI:
- Settings toggle with email input.
- History shared filter: Mine / Partner / All, totals and split.
- Badges for shared items.

Security:
- JWT auth; enforce reciprocity before exposing partner data.

Phase 2:
- Per-transaction splits, weights, settle-up flow.
