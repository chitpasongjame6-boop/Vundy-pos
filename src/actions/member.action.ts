"use server";

import { revalidatePath } from "next/cache";
import { readLocalStore, updateLocalStore } from "@/lib/local-store";
import { buildMemberSummaries } from "@/lib/members";
import type { MemberSummary, MemberTier } from "@/types";

export async function getMembers(search?: string): Promise<MemberSummary[]> {
  const store = await readLocalStore();
  const query = search?.trim().toLowerCase();
  const summaries = buildMemberSummaries(
    store.members ?? [],
    store.memberTiers ?? [],
    store.sales ?? []
  ).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  if (!query) {
    return summaries;
  }

  return summaries.filter(
    (member) =>
      member.name.toLowerCase().includes(query) ||
      member.phone.toLowerCase().includes(query) ||
      member.tier?.name.toLowerCase().includes(query)
  );
}

export async function getActiveMembers(): Promise<MemberSummary[]> {
  const members = await getMembers();

  return members
    .filter((member) => member.isActive)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMemberTiers(): Promise<MemberTier[]> {
  const store = await readLocalStore();

  return [...(store.memberTiers ?? [])].sort((a, b) => a.minSpend - b.minSpend);
}

export async function createMember(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name || !phone) {
    return;
  }

  const now = new Date();

  await updateLocalStore((store) => {
    const existing = store.members.find((member) => member.phone === phone);

    if (existing) {
      return {
        ...store,
        members: store.members.map((member) =>
          member.id === existing.id
            ? { ...member, name, phone, isActive: true, updatedAt: now }
            : member
        )
      };
    }

    return {
      ...store,
      members: [
        {
          id: crypto.randomUUID(),
          name,
          phone,
          isActive: true,
          createdAt: now,
          updatedAt: now
        },
        ...(store.members ?? [])
      ]
    };
  });

  revalidateMemberPaths();
}

export async function updateMember(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!id || !name || !phone) {
    return;
  }

  const now = new Date();

  await updateLocalStore((store) => ({
    ...store,
    members: (store.members ?? []).map((member) =>
      member.id === id ? { ...member, name, phone, updatedAt: now } : member
    )
  }));

  revalidateMemberPaths();
}

export async function deactivateMember(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  const now = new Date();

  await updateLocalStore((store) => ({
    ...store,
    members: (store.members ?? []).map((member) =>
      member.id === id ? { ...member, isActive: false, updatedAt: now } : member
    )
  }));

  revalidateMemberPaths();
}

export async function createMemberTier(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const minSpend = parsePositiveInt(formData.get("minSpend"));
  const discountPercent = parseDiscountPercent(formData.get("discountPercent"));

  if (!name) {
    return;
  }

  await updateLocalStore((store) => ({
    ...store,
    memberTiers: [
      ...(store.memberTiers ?? []),
      {
        id: crypto.randomUUID(),
        name,
        minSpend,
        discountPercent,
        isActive: true
      }
    ]
  }));

  revalidateMemberPaths();
  revalidatePath("/settings");
}

export async function updateMemberTier(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const minSpend = parsePositiveInt(formData.get("minSpend"));
  const discountPercent = parseDiscountPercent(formData.get("discountPercent"));

  if (!id || !name) {
    return;
  }

  await updateLocalStore((store) => ({
    ...store,
    memberTiers: (store.memberTiers ?? []).map((tier) =>
      tier.id === id ? { ...tier, name, minSpend, discountPercent } : tier
    )
  }));

  revalidateMemberPaths();
  revalidatePath("/settings");
}

export async function deleteMemberTier(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  await updateLocalStore((store) => ({
    ...store,
    memberTiers: (store.memberTiers ?? []).filter((tier) => tier.id !== id)
  }));

  revalidateMemberPaths();
  revalidatePath("/settings");
}

function parsePositiveInt(value: FormDataEntryValue | null) {
  return Math.max(0, Math.round(Number(String(value ?? "0").replace(/[,.]/g, ""))));
}

function parseDiscountPercent(value: FormDataEntryValue | null) {
  return Math.min(100, Math.max(0, Math.round(Number(value ?? 0))));
}

function revalidateMemberPaths() {
  revalidatePath("/members");
  revalidatePath("/pos");
  revalidatePath("/pos/history");
  revalidatePath("/exports");
}
