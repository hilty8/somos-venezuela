import { db } from "@/lib/db";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "unpublish"
  | "activate"
  | "deactivate";

export type AuditEntity =
  | "donation_campaign"
  | "source"
  | "article"
  | "template"
  | "prompt"
  | "youtube_card"
  | "history_entry";

export async function createAuditLog({
  userId,
  action,
  entity,
  entityId,
  changes,
}: {
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  changes?: Record<string, unknown>;
}) {
  await db.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      changes: changes || null,
    },
  });
}
