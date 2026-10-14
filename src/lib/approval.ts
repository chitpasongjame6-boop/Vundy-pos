import { timingSafeEqual } from "node:crypto";
import type { AppUser } from "@/lib/auth-config";

export type ApprovalIdentity = {
  id: string;
  name: string;
};

export function verifyOwnerApproval(
  currentUser: AppUser,
  approvalPin?: string | null
): ApprovalIdentity | null {
  if (currentUser.role === "OWNER") {
    return { id: currentUser.id, name: currentUser.name };
  }

  const configuredPin =
    process.env.OWNER_APPROVAL_PIN?.trim() || process.env.OWNER_PASSWORD?.trim();
  const candidate = String(approvalPin ?? "").trim();

  if (!configuredPin || !candidate || !safeEqual(candidate, configuredPin)) {
    return null;
  }

  return {
    id: "owner",
    name: process.env.OWNER_NAME || "ເຈົ້າຂອງຮ້ານ"
  };
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
