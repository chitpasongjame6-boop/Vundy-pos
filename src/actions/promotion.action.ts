"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser, requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readLocalStore, updateLocalStore } from "@/lib/local-store";
import { parseLaoDateTime, validatePromotion } from "@/lib/promotions";
import type { Product, Promotion, PromotionInput } from "@/types";

const hasDatabase = Boolean(process.env.DATABASE_URL);

export async function getPromotions() {
  await requireOwner();
  const promotions = hasDatabase
    ? await prisma.promotion.findMany({ orderBy: { createdAt: "desc" } }) as Promotion[]
    : (await readLocalStore()).promotions;
  return { promotions, serverNow: Date.now() };
}

export async function getPosPromotions() {
  await requireAuthenticatedUser();
  const now = new Date();
  const promotions = hasDatabase
    ? await prisma.promotion.findMany({ where: { isActive: true, endsAt: { gt: now } } }) as Promotion[]
    : (await readLocalStore()).promotions.filter(item => item.isActive && new Date(item.endsAt) > now);
  return { promotions, serverNow: Date.now() };
}

export async function savePromotion(input: PromotionInput) {
  const user = await requireOwner();
  if (input?.id && (typeof input.id !== "string" || (hasDatabase && !/^[a-f\d]{24}$/i.test(input.id)))) {
    return { ok: false, message: "ບໍ່ພົບໂປຣໂມຊັນ" };
  }
  try {
    const save = (products: Product[]) => {
      const error = validatePromotion(input, products);
      if (error) throw new Error(error);
      return {
        name: input.name.trim(), kind: input.kind, value: input.value,
        targets: input.targets.map(({ productId, variantId }) => ({ productId, variantId })),
        startsAt: parseLaoDateTime(input.startsAt)!, endsAt: parseLaoDateTime(input.endsAt)!,
        isActive: input.isActive
      };
    };
    // Validate outside the persistence catch so input errors are safe to show.
    const products = hasDatabase ? await prisma.product.findMany() as Product[] : (await readLocalStore()).products;
    const error = validatePromotion(input, products);
    if (error) return { ok: false, message: error };
    const now = new Date();
    const audit = {
      action: input.id ? "PROMOTION_UPDATED" : "PROMOTION_CREATED", entityType: "PROMOTION",
      description: input.name.trim(), userId: user.id, userName: user.name, userRole: user.role
    };
    if (hasDatabase) {
      await prisma.$transaction(async tx => {
        const data = save(await tx.product.findMany() as Product[]);
        const promotion = input.id
          ? await tx.promotion.update({ where: { id: input.id }, data })
          : await tx.promotion.create({ data });
        await tx.auditLog.create({ data: { ...audit, entityId: promotion.id } });
      });
    } else {
      await updateLocalStore(store => {
        const previous = input.id ? store.promotions.find(item => item.id === input.id) : null;
        if (input.id && !previous) throw new Error("Promotion missing");
        const promotion: Promotion = { ...save(store.products), id: previous?.id ?? crypto.randomUUID(),
          createdAt: previous?.createdAt ?? now, updatedAt: now };
        return { ...store, promotions: [promotion, ...store.promotions.filter(item => item.id !== promotion.id)],
          auditLogs: [{ ...audit, id: crypto.randomUUID(), entityId: promotion.id, createdAt: now }, ...store.auditLogs] };
      });
    }
    revalidatePath("/promotions");
    revalidatePath("/pos");
    return { ok: true, message: "ບັນທຶກໂປຣໂມຊັນສໍາເລັດ" };
  } catch {
    return { ok: false, message: "ບັນທຶກບໍ່ສໍາເລັດ ກະລຸນາໂຫຼດໜ້າໃໝ່ ແລະ ລອງອີກຄັ້ງ" };
  }
}

export async function setPromotionEnabled(id: string, isActive: boolean) {
  const user = await requireOwner();
  if (typeof id !== "string" || typeof isActive !== "boolean" || (hasDatabase && !/^[a-f\d]{24}$/i.test(id))) {
    return { ok: false, message: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }
  try {
    const audit = { action: isActive ? "PROMOTION_ENABLED" : "PROMOTION_PAUSED", entityType: "PROMOTION",
      entityId: id, description: isActive ? "ເປີດໂປຣໂມຊັນ" : "ຢຸດໂປຣໂມຊັນ", userId: user.id, userName: user.name, userRole: user.role };
    if (hasDatabase) {
      await prisma.$transaction(async tx => {
        await tx.promotion.update({ where: { id }, data: { isActive } });
        await tx.auditLog.create({ data: audit });
      });
    } else {
      await updateLocalStore(store => {
        if (!store.promotions.some(item => item.id === id)) throw new Error("Promotion missing");
        return { ...store, promotions: store.promotions.map(item => item.id === id ? { ...item, isActive, updatedAt: new Date() } : item),
          auditLogs: [{ ...audit, id: crypto.randomUUID(), createdAt: new Date() }, ...store.auditLogs] };
      });
    }
    revalidatePath("/promotions");
    revalidatePath("/pos");
    return { ok: true, message: "ປັບສະຖານະສໍາເລັດ" };
  } catch {
    return { ok: false, message: "ປັບສະຖານະບໍ່ສໍາເລັດ ກະລຸນາລອງໃໝ່" };
  }
}

export async function deletePromotion(id: string) {
  const user = await requireOwner();
  if (typeof id !== "string" || !id.trim() || id.length > 128 || (hasDatabase && !/^[a-f\d]{24}$/i.test(id))) {
    return { ok: false, message: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }
  try {
    const audit = { action: "PROMOTION_DELETED", entityType: "PROMOTION", entityId: id,
      userId: user.id, userName: user.name, userRole: user.role };
    // Sale items contain their own price/promotion snapshots. Never modify them on deletion.
    if (hasDatabase) {
      await prisma.$transaction(async tx => {
        const promotion = await tx.promotion.delete({ where: { id } });
        await tx.auditLog.create({ data: { ...audit, description: promotion.name } });
      });
    } else {
      await updateLocalStore(store => {
        const promotion = store.promotions.find(item => item.id === id);
        if (!promotion) throw new Error("Promotion missing");
        return { ...store, promotions: store.promotions.filter(item => item.id !== id),
          auditLogs: [{ ...audit, description: promotion.name, id: crypto.randomUUID(), createdAt: new Date() }, ...store.auditLogs] };
      });
    }
    revalidatePath("/promotions");
    revalidatePath("/pos");
    return { ok: true, message: "ລຶບໂປຣໂມຊັນສໍາເລັດ — ຂໍ້ມູນບິນເກົ່າຍັງຢູ່ຄືເກົ່າ" };
  } catch {
    return { ok: false, message: "ລຶບບໍ່ສໍາເລັດ ກະລຸນາໂຫຼດໜ້າໃໝ່ ແລະ ລອງອີກຄັ້ງ" };
  }
}
