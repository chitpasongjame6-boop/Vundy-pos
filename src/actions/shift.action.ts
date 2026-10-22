"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { readLocalStore, updateLocalStore } from "@/lib/local-store";
import { requireAuthenticatedUser } from "@/lib/auth";
import { verifyOwnerApproval } from "@/lib/approval";
import { buildReadableNumber } from "@/lib/document-number";
import type { CashMovement, CashShift, Sale } from "@/types";
import { expectedDrawerCash, movementBalance } from "@/lib/cash-currency";
import { parseDecimal } from "@/lib/currency";

const hasDatabase = Boolean(process.env.DATABASE_URL);

export async function getShiftWorkspace() {
  const user = await requireAuthenticatedUser();

  if (!hasDatabase) {
    const store = await readLocalStore();
    const current = store.cashShifts.find(
      (shift) => shift.cashierId === user.id && shift.status === "OPEN"
    ) ?? null;
    return {
      current,
      movements: current
        ? store.cashMovements.filter((movement) => movement.shiftId === current.id)
        : [],
      expectedCash: current
        ? calculateExpectedCash(
            current,
            store.sales.filter((sale) => sale.shiftId === current.id),
            store.cashMovements.filter((movement) => movement.shiftId === current.id)
          )
        : 0,
      expectedThb: current ? (current.openingThb ?? 0) + movementBalance(store.cashMovements.filter(m => m.shiftId === current.id), "THB") : 0,
      history: store.cashShifts.slice().sort(
        (left, right) => right.openedAt.getTime() - left.openedAt.getTime()
      ).slice(0, 30),
      branches: store.branches.filter((branch) => branch.isActive),
      registers: store.registers.filter((register) => register.isActive)
    };
  }

  const current = (await prisma.cashShift.findFirst({
    where: { cashierId: user.id, status: "OPEN" },
    orderBy: { openedAt: "desc" }
  })) as unknown as CashShift | null;
  const [movements, sales, history, branches, registers] = await Promise.all([
    current
      ? prisma.cashMovement.findMany({
          where: { shiftId: current.id },
          orderBy: { createdAt: "desc" }
        })
      : Promise.resolve([]),
    current
      ? prisma.sale.findMany({ where: { shiftId: current.id } })
      : Promise.resolve([]),
    prisma.cashShift.findMany({ orderBy: { openedAt: "desc" }, take: 30 }),
    prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.register.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
  ]);

  return {
    current,
    movements: movements as unknown as CashMovement[],
    expectedCash: current
      ? calculateExpectedCash(
          current,
          sales as unknown as Sale[],
          movements as unknown as CashMovement[]
        )
      : 0,
    history: history as unknown as CashShift[],
    expectedThb: current ? (current.openingThb ?? 0) + movementBalance(movements as unknown as CashMovement[], "THB") : 0,
    branches,
    registers
  };
}

export async function openCashShift(formData: FormData): Promise<void> {
  const user = await requireAuthenticatedUser();
  const openingCash = parseMoney(formData.get("openingCash"));
  const openingThb = parseDecimal(formData.get("openingThb") || "0", 2);
  const requestedBranchId = String(formData.get("branchId") ?? "").trim() || null;
  const requestedRegisterId = String(formData.get("registerId") ?? "").trim() || null;
  const now = new Date();

  if (!hasDatabase) {
    await updateLocalStore((store) => {
      if (store.cashShifts.some((shift) => shift.cashierId === user.id && shift.status === "OPEN")) {
        return store;
      }
      const branch = store.branches.find((item) => item.id === requestedBranchId && item.isActive);
      const register = store.registers.find(
        (item) => item.id === requestedRegisterId && item.isActive && (!branch || item.branchId === branch.id)
      );
      const shift: CashShift = {
        id: crypto.randomUUID(),
        shiftNo: buildReadableNumber("SHIFT", now, store.cashShifts.length + 1),
        branchId: branch?.id ?? null,
        branchName: branch?.name ?? (store.storeSettings.defaultBranchName || null),
        registerId: register?.id ?? null,
        registerName: register?.name ?? (store.storeSettings.defaultRegisterName || null),
        cashierId: user.id,
        cashierName: user.name,
        status: "OPEN",
        openingCash,
        openingThb,
        openedAt: now,
        createdAt: now,
        updatedAt: now
      };
      return {
        ...store,
        cashShifts: [shift, ...store.cashShifts],
        auditLogs: [{
          id: crypto.randomUUID(),
          action: "SHIFT_OPENED",
          entityType: "CASH_SHIFT",
          entityId: shift.id,
          entityNo: shift.shiftNo,
          description: `ເປີດກະດ້ວຍເງິນ ${openingCash}`,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          metadata: { openingCash, openingThb },
          createdAt: now
        }, ...store.auditLogs]
      };
    });
  } else {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.cashShift.findFirst({
        where: { cashierId: user.id, status: "OPEN" }
      });
      if (existing) return;
      const [settings, branch, register] = await Promise.all([
        tx.storeSettingsRecord.findUnique({ where: { id: "default" } }),
        requestedBranchId ? tx.branch.findFirst({ where: { id: requestedBranchId, isActive: true } }) : null,
        requestedRegisterId ? tx.register.findFirst({ where: { id: requestedRegisterId, isActive: true } }) : null
      ]);
      const shift = await tx.cashShift.create({
        data: {
          shiftNo: buildReadableNumber("SHIFT", now, (await tx.cashShift.count()) + 1),
          branchId: branch?.id ?? null,
          branchName: branch?.name ?? settings?.defaultBranchName ?? null,
          registerId: register?.id ?? null,
          registerName: register?.name ?? settings?.defaultRegisterName ?? null,
          cashierId: user.id,
          cashierName: user.name,
          openingCash,
          openingThb
        }
      });
      await tx.auditLog.create({
        data: {
          action: "SHIFT_OPENED",
          entityType: "CASH_SHIFT",
          entityId: shift.id,
          entityNo: shift.shiftNo,
          description: `ເປີດກະດ້ວຍເງິນ ${openingCash}`,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          metadata: { openingCash, openingThb }
        }
      });
    });
  }

  revalidateShiftPaths();
}

export async function addCashMovement(formData: FormData): Promise<void> {
  const user = await requireAuthenticatedUser();
  const shiftId = String(formData.get("shiftId") ?? "").trim();
  const type = formData.get("type") === "CASH_OUT" ? "CASH_OUT" : "CASH_IN";
  const currency = formData.get("currency") === "THB" ? "THB" : "LAK";
  const amount = parseDecimal(formData.get("amount") || "0", currency === "THB" ? 2 : 0);
  const reason = String(formData.get("reason") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!shiftId || !amount || !reason) return;
  const now = new Date();

  if (!hasDatabase) {
    await updateLocalStore((store) => {
      const shift = store.cashShifts.find(
        (item) => item.id === shiftId && item.cashierId === user.id && item.status === "OPEN"
      );
      if (!shift) return store;
      const movement: CashMovement = {
        id: crypto.randomUUID(), shiftId, type, amount, currency, reason, note,
        userId: user.id, userName: user.name, createdAt: now
      };
      return {
        ...store,
        cashMovements: [movement, ...store.cashMovements],
        auditLogs: [{
          id: crypto.randomUUID(), action: type, entityType: "CASH_SHIFT",
          entityId: shift.id, entityNo: shift.shiftNo,
          description: reason, userId: user.id, userName: user.name,
          userRole: user.role, metadata: { amount, currency, note }, createdAt: now
        }, ...store.auditLogs]
      };
    });
  } else {
    await prisma.$transaction(async (tx) => {
      const shift = await tx.cashShift.findFirst({
        where: { id: shiftId, cashierId: user.id, status: "OPEN" }
      });
      if (!shift) return;
      await tx.cashShift.update({ where: { id: shiftId, status: "OPEN" }, data: { updatedAt: now } });
      await tx.cashMovement.create({
        data: { shiftId, type, amount, currency, reason, note, userId: user.id, userName: user.name }
      });
      await tx.auditLog.create({
        data: {
          action: type, entityType: "CASH_SHIFT", entityId: shift.id,
          entityNo: shift.shiftNo, description: reason, userId: user.id,
          userName: user.name, userRole: user.role, metadata: { amount, currency, note }
        }
      });
    });
  }

  revalidateShiftPaths();
}

export async function closeCashShift(formData: FormData): Promise<void> {
  const user = await requireAuthenticatedUser();
  const shiftId = String(formData.get("shiftId") ?? "").trim();
  const countedCash = parseMoney(formData.get("countedCash"));
  const countedThb = parseDecimal(formData.get("countedThb") || "0", 2);
  const note = String(formData.get("note") ?? "").trim() || null;
  const approval = verifyOwnerApproval(user, String(formData.get("approvalPin") ?? ""));
  if (!shiftId || !approval) return;
  const now = new Date();

  if (!hasDatabase) {
    await updateLocalStore((store) => {
      const shift = store.cashShifts.find(
        (item) => item.id === shiftId && item.cashierId === user.id && item.status === "OPEN"
      );
      if (!shift) return store;
      const expectedCash = calculateExpectedCash(
        shift,
        store.sales.filter((sale) => sale.shiftId === shift.id),
        store.cashMovements.filter((movement) => movement.shiftId === shift.id)
      );
      const expectedThb = (shift.openingThb ?? 0) + movementBalance(store.cashMovements.filter(m => m.shiftId === shift.id), "THB");
      return {
        ...store,
        cashShifts: store.cashShifts.map((item) => item.id === shift.id ? {
          ...item, status: "CLOSED", expectedCash, countedCash,
          expectedThb, countedThb, differenceThb: countedThb - expectedThb,
          cashDifference: countedCash - expectedCash, note, closedAt: now,
          closedById: user.id, closedByName: user.name, updatedAt: now
        } : item),
        auditLogs: [{
          id: crypto.randomUUID(), action: "SHIFT_CLOSED", entityType: "CASH_SHIFT",
          entityId: shift.id, entityNo: shift.shiftNo, description: "ປິດກະຂາຍ",
          userId: user.id, userName: user.name, userRole: user.role,
          approvedById: approval.id, approvedByName: approval.name,
          metadata: { expectedCash, countedCash, difference: countedCash - expectedCash, expectedThb, countedThb, differenceThb: countedThb - expectedThb },
          createdAt: now
        }, ...store.auditLogs]
      };
    });
  } else {
    await prisma.$transaction(async (tx) => {
      const shift = (await tx.cashShift.findFirst({
        where: { id: shiftId, cashierId: user.id, status: "OPEN" }
      })) as unknown as CashShift | null;
      if (!shift) return;
      const [sales, movements] = await Promise.all([
        tx.sale.findMany({ where: { shiftId } }),
        tx.cashMovement.findMany({ where: { shiftId } })
      ]);
      const expectedCash = calculateExpectedCash(
        shift, sales as unknown as Sale[], movements as unknown as CashMovement[]
      );
      const expectedThb = (shift.openingThb ?? 0) + movementBalance(movements as unknown as CashMovement[], "THB");
      await tx.cashShift.update({
        where: { id: shiftId },
        data: {
          status: "CLOSED", expectedCash, countedCash,
          expectedThb, countedThb, differenceThb: countedThb - expectedThb,
          cashDifference: countedCash - expectedCash, note, closedAt: now,
          closedById: user.id, closedByName: user.name
        }
      });
      await tx.auditLog.create({
        data: {
          action: "SHIFT_CLOSED", entityType: "CASH_SHIFT", entityId: shift.id,
          entityNo: shift.shiftNo, description: "ປິດກະຂາຍ", userId: user.id,
          userName: user.name, userRole: user.role, approvedById: approval.id,
          approvedByName: approval.name,
          metadata: { expectedCash, countedCash, difference: countedCash - expectedCash, expectedThb, countedThb, differenceThb: countedThb - expectedThb }
        }
      });
    });
  }

  revalidateShiftPaths();
}

function calculateExpectedCash(shift: CashShift, sales: Sale[], movements: CashMovement[]) {
  return expectedDrawerCash(shift, sales, movements).lak;
}

function parseMoney(value: FormDataEntryValue | null) {
  return Math.max(0, Math.round(Number(String(value ?? "0").replace(/[^\d.-]/g, "")) || 0));
}

function revalidateShiftPaths() {
  revalidatePath("/pos");
  revalidatePath("/pos/shifts");
  revalidatePath("/pos/closing");
  revalidatePath("/dashboard");
}
