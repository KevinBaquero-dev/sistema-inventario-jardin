// =============================================================================
// src/services/user.service.ts
// Gestión de usuarios del sistema
// =============================================================================

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { db } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { parsePaginationQuery, buildPaginationMeta } from '../utils/response';
import type { CreateUserInput, UpdateUserInput } from '../validators/user.validator';

const userSelect = {
  id: true, email: true, fullName: true, role: true, status: true,
  phone: true, avatarUrl: true, mustChangePassword: true,
  lastLoginAt: true, createdAt: true, updatedAt: true,
  sectionAccess: {
    select: {
      section: {
        select: { id: true, name: true, icon: true, color: true, isActive: true },
      },
    },
  },
} satisfies Prisma.UserSelect;

export const UserService = {

  async findAll(query: Record<string, unknown>) {
    const { page, limit, skip, sortOrder } = parsePaginationQuery(query);
    const search = query.search as string | undefined;
    const role   = query.role   as string | undefined;
    const status = query.status as string | undefined;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role   && { role:   role as Prisma.EnumUserRoleFilter }),
      ...(status && { status: status as Prisma.EnumUserStatusFilter }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email:    { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: userSelect,
        orderBy: { fullName: sortOrder },
        skip,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    return { data: users, meta: buildPaginationMeta(total, page, limit) };
  },

  async findById(id: string) {
    const user = await db.user.findFirst({ where: { id, deletedAt: null }, select: userSelect });
    if (!user) throw new AppError('Usuario no encontrado', 404);
    return user;
  },

  async create(input: CreateUserInput) {
    const exists = await db.user.findFirst({
      where: { email: input.email, deletedAt: null },
    });
    if (exists) throw new AppError('El email ya está registrado', 409);

    // Si no trae password, generar temporal
    const tempPassword = input.password ?? crypto.randomBytes(8).toString('hex') + 'A1!';
    const hash = await bcrypt.hash(tempPassword, env.BCRYPT_ROUNDS);

    const user = await db.user.create({
      data: {
        email:              input.email,
        passwordHash:       hash,
        fullName:           input.fullName,
        role:               input.role ?? 'ASSISTANT',
        phone:              input.phone,
        mustChangePassword: !input.password, // si fue generada, debe cambiarla
      },
      select: userSelect,
    });

    return {
      ...user,
      ...(input.password ? {} : { temporaryPassword: tempPassword }),
    };
  },

  async update(id: string, input: UpdateUserInput) {
    const user = await db.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    return db.user.update({
      where: { id },
      data: {
        ...(input.fullName !== undefined && { fullName: input.fullName }),
        ...(input.phone    !== undefined && { phone: input.phone }),
        ...(input.role     !== undefined && { role:   input.role }),
        ...(input.status   !== undefined && { status: input.status }),
      },
      select: userSelect,
    });
  },

  async resetPassword(id: string, newPassword?: string) {
    const user = await db.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const tempPassword = newPassword ?? crypto.randomBytes(8).toString('hex') + 'A1!';
    const hash = await bcrypt.hash(tempPassword, env.BCRYPT_ROUNDS);

    await db.user.update({
      where: { id },
      data: {
        passwordHash:       hash,
        mustChangePassword: true,
        failedLoginCount:   0,
        lockedUntil:        null,
      },
    });

    return { temporaryPassword: tempPassword };
  },

  async delete(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new AppError('No puedes eliminar tu propia cuenta', 400);
    }
    const user = await db.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    await db.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });

    return { id, email: user.email };
  },

  // ── Gestión de secciones asignadas ──────────────────────────────────────────

  async getSections(userId: string) {
    const user = await db.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    // Admin ve todas las secciones sin restricción
    if (user.role === 'ADMIN') {
      const sections = await db.section.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true, name: true, icon: true, color: true, isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      });
      return sections;
    }

    const access = await db.userSection.findMany({
      where: { userId },
      select: { section: { select: { id: true, name: true, icon: true, color: true, isActive: true } } },
    });
    return access.map(a => a.section);
  },

  async setSections(userId: string, sectionIds: string[]) {
    const user = await db.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new AppError('Usuario no encontrado', 404);
    if (user.role === 'ADMIN') throw new AppError('El administrador tiene acceso a todas las secciones', 400);

    // Reemplazar todas las asignaciones de una vez (delete + createMany)
    await db.$transaction([
      db.userSection.deleteMany({ where: { userId } }),
      db.userSection.createMany({
        data: sectionIds.map(sectionId => ({ userId, sectionId })),
        skipDuplicates: true,
      }),
    ]);

    return this.getSections(userId);
  },

  // IDs de secciones permitidas para un usuario (vacío = sin acceso, null = acceso total para ADMIN)
  async getAllowedSectionIds(userId: string, role: string): Promise<string[] | null> {
    if (role === 'ADMIN') return null; // null = sin restricción
    const access = await db.userSection.findMany({
      where: { userId },
      select: { sectionId: true },
    });
    return access.map(a => a.sectionId);
  },
};
