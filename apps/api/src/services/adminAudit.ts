import { prisma } from "../db/client"

export async function logAdminAction(params: {
  adminId: string
  action: string
  targetType: string
  targetId?: string
  metadata?: any
  ip?: string
}) {
  return prisma.adminAuditLog.create({
    data: {
      adminId: params.adminId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata,
      ip: params.ip
    }
  })
}
