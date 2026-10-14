# POS production checklist

## Runtime

- Use Node.js `22.22.2` (see `.nvmrc` and `.node-version`).
- Run `npm run prisma:generate` after changing `prisma/schema.prisma`.
- Before enabling MongoDB in production, run `npx prisma db push` against the intended database and take a backup first.
- The current development override `.env.local` can leave `DATABASE_URL` empty to use `.local-data/stock-order-store.json` for single-machine testing.

## Security

- Set strong, unique values for `OWNER_PASSWORD`, `STAFF_PASSWORD`, and `SESSION_SECRET`.
- Set `OWNER_APPROVAL_PIN`; staff need this PIN for high discounts, returns, bill cancellation, closing shifts, and daily closing.
- Rotate database and object-storage credentials before production if they were ever shared or logged.

## POS workflow

1. Configure branch, register, tax, and whether a shift is required in Settings. Discounts are owner-only.
2. Open a shift at `/pos/shifts` and enter the opening float.
3. Sell at `/pos`; cash below the net total is rejected and split payments must match exactly.
4. Record cash-in/cash-out and expenses during the shift.
5. Close the shift using counted cash and owner approval.
6. Use `/pos/history` for partial returns, full returns, cancellations, and receipt copies.

## Inventory workflow

- `/inventory` manages suppliers, purchase orders, receiving, expenses, branches/registers, adjustments, damaged stock, stock movements, and audit logs.
- Receiving a purchase order updates stock and the latest variant cost.
- Sales and returns automatically create stock movement records.

## Backup and export

- Settings provides JSON backup and restore. Restoring replaces current business data; download a fresh backup first.
- `/exports` provides printable reports plus CSV files for sales, products, and stock movements. CSV files open directly in Excel.

## Offline and hardware

- The production build installs a PWA manifest and service worker for the offline information page and static assets.
- Transactional sales are intentionally not stored only in the browser. When offline, wait for connectivity so stock and payment data remain consistent.
- Browser printing supports 58/80 mm receipts. Settings includes an ESC/POS Web Serial drawer-pulse test for supported Chrome/Edge installations over HTTPS or localhost.

## MongoDB Atlas checks

If `/api/health` reports database unavailable:

1. Confirm the Atlas cluster is running and has a primary.
2. Add the production server IP to Atlas Network Access.
3. Confirm the database user and password are valid and URL-encoded.
4. Confirm TLS inspection/firewall software is not terminating the MongoDB TLS connection.
5. Test with `node scripts/check-db.mjs`, then set `DATABASE_URL` in the production environment.
