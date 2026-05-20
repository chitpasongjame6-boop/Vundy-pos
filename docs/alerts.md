# Alerts Page

## Purpose

`/alerts` is the combined task page for the shop owner. It collects urgent work from orders, POS closing, and stock into one screen.

## Data Sources

- Orders: `getOrders()` from `src/actions/order.action.ts`
- Products and variants: `getProducts()` and `getProductVariants()`
- POS daily closing: `getDailyClosing()` from `src/actions/pos.action.ts`

## Current Alert Groups

- Pending pack orders: orders with `status === "PENDING_PACK"`
- COD not shipped: orders with `paymentStatus === "COD"` and status not shipped, cancelled, or returned
- Low/out stock: active product variants where `stock <= lowStockAlert`
- Daily closing: shows warning when today has no closing record
- Returned orders: orders with `status === "RETURNED"`

## Related Files

- Page UI: `src/app/alerts/page.tsx`
- Navigation: `src/components/layout/app-shell.tsx`
- Dashboard task summary: `src/actions/dashboard.action.ts`

## Revalidation

The page is revalidated after order changes, POS closing changes, and product stock changes.
