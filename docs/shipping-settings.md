# Shipping Company Settings

## Purpose

Shipping companies are now managed from `/settings` instead of being hardcoded in each order screen.

## Stored Data

The list is stored in `StoreSettings.shippingCompanies`.

Default values:

- ຮຸ່ງອາລຸນ
- ອານຸສິດ
- ມີໄຊ
- Unitel

## Related Files

- Type definition: `src/types/index.ts`
- Default local store values: `src/lib/local-store.ts`
- Settings actions: `src/actions/settings.action.ts`
- Settings UI: `src/app/settings/page.tsx`
- New order form: `src/app/orders/new/page.tsx`
- Order form component: `src/components/orders/order-form.tsx`
- Order edit form: `src/components/orders/order-list.tsx`

## Behavior

- Adding a company makes it available in new orders.
- Editing a company updates the selectable list going forward.
- Deleting a company removes it from the selectable list.
- Existing orders keep the shipping company text that was saved on the order.
