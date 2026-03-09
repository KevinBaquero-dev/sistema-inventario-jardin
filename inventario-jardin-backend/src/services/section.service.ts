// =============================================================================
// src/services/section.service.ts
// CRUD de secciones + campos personalizados dinámicos
// =============================================================================

import { Prisma } from '@prisma/client';
import { db } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { slugify } from '../utils/slugify';
import { parsePaginationQuery, buildPaginationMeta } from '../utils/response';
import { PaginationQuery } from '../types';
import type {
  CreateSectionInput,
  UpdateSectionInput,
  CreateCustomFieldInput,
  UpdateCustomFieldInput,
} from '../validators/section.validator';

// ── Selector estándar ─────────────────────────────────────────────────────────

const sectionSelect = {
  id: true, name: true, slug: true, description: true,
  color: true, icon: true, displayOrder: true, isActive: true,
  createdAt: true, updatedAt: true,
  createdBy: { select: { id: true, fullName: true } },
  _count: { select: { items: true } },
} satisfies Prisma.SectionSelect;

const fieldSelect = {
  id: true, sectionId: true, name: true, slug: true,
  fieldType: true, label: true, placeholder: true, helpText: true,
  isRequired: true, isSearchable: true, isVisibleList: true,
  displayOrder: true, defaultValue: true, validationRules: true,
  createdAt: true, updatedAt: true,
  dropdownOptions: {
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' as const },
    select: { id: true, label: true, value: true, color: true, displayOrder: true },
  },
} satisfies Prisma.CustomFieldSelect;

// ── SectionService ─────────────────────────────────────────────────────────────

export const SectionService = {

  async findAll(query: PaginationQuery, allowedSectionIds?: string[] | null) {
    const { page, limit, skip } = parsePaginationQuery(query);
    const search = query.search as string | undefined;
    const showInactive = (query.showInactive as string) === 'true';

    const where: Prisma.SectionWhereInput = {
      deletedAt: null,
      ...(showInactive ? {} : { isActive: true }),
      // Si allowedSectionIds es un array (no null), filtrar solo esas secciones
      ...(allowedSectionIds !== null && allowedSectionIds !== undefined && {
        id: { in: allowedSectionIds },
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [sections, total] = await Promise.all([
      db.section.findMany({
        where,
        select: sectionSelect,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      db.section.count({ where }),
    ]);

    return { data: sections, meta: buildPaginationMeta(total, page, limit) };
  },

  async findById(id: string) {
    const section = await db.section.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...sectionSelect,
        customFields: {
          where: { deletedAt: null },
          orderBy: { displayOrder: 'asc' },
          select: fieldSelect,
        },
      },
    });
    if (!section) throw new AppError('Sección no encontrada', 404);
    return section;
  },

  async create(input: CreateSectionInput, createdById: string) {
    const slug = slugify(input.name);

    // Slug único: agregar sufijo numérico si ya existe
    const existing = await db.section.count({ where: { slug, deletedAt: null } });
    const finalSlug = existing > 0 ? `${slug}-${Date.now()}` : slug;

    return db.section.create({
      data: {
        name:         input.name,
        slug:         finalSlug,
        description:  input.description,
        color:        input.color,
        icon:         input.icon,
        displayOrder: input.displayOrder ?? 0,
        createdById,
      },
      select: sectionSelect,
    });
  },

  async update(id: string, input: UpdateSectionInput, userId: string) {
    const existing = await db.section.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new AppError('Sección no encontrada', 404);

    // Si cambia el nombre, regenerar slug
    let slug: string | undefined;
    if (input.name && input.name !== existing.name) {
      const baseSlug = slugify(input.name);
      const count = await db.section.count({
        where: { slug: baseSlug, deletedAt: null, id: { not: id } },
      });
      slug = count > 0 ? `${baseSlug}-${Date.now()}` : baseSlug;
    }

    void userId; // disponible para audit externo
    return db.section.update({
      where: { id },
      data: {
        ...(input.name        !== undefined && { name: input.name, ...(slug && { slug }) }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.color       !== undefined && { color: input.color }),
        ...(input.icon        !== undefined && { icon: input.icon }),
        ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
        ...(input.isActive    !== undefined && { isActive: input.isActive }),
      },
      select: sectionSelect,
    });
  },

  async delete(id: string) {
    const section = await db.section.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { items: true } } },
    });
    if (!section) throw new AppError('Sección no encontrada', 404);
    if (section._count.items > 0) {
      throw new AppError(
        `No se puede eliminar: tiene ${section._count.items} producto(s) asociado(s). Desactívala en su lugar.`,
        409
      );
    }
    return db.section.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: { id: true, name: true },
    });
  },
};

// ── CustomFieldService ────────────────────────────────────────────────────────

export const CustomFieldService = {

  async findBySectionId(sectionId: string) {
    const section = await db.section.findFirst({ where: { id: sectionId, deletedAt: null } });
    if (!section) throw new AppError('Sección no encontrada', 404);

    return db.customField.findMany({
      where: { sectionId, deletedAt: null },
      orderBy: { displayOrder: 'asc' },
      select: fieldSelect,
    });
  },

  async create(sectionId: string, input: CreateCustomFieldInput, _createdById: string) {
    const section = await db.section.findFirst({ where: { id: sectionId, deletedAt: null } });
    if (!section) throw new AppError('Sección no encontrada', 404);

    const slug = slugify(input.name);
    const existing = await db.customField.findFirst({
      where: { sectionId, slug, deletedAt: null },
    });
    if (existing) throw new AppError(`Ya existe un campo con nombre similar: "${input.name}"`, 409);

    return db.$transaction(async (tx) => {
      const field = await tx.customField.create({
        data: {
          sectionId,
          name:           input.name,
          slug,
          fieldType:      input.fieldType,
          label:          input.label,
          placeholder:    input.placeholder,
          helpText:       input.helpText,
          isRequired:     input.isRequired ?? false,
          isSearchable:   input.isSearchable ?? false,
          isVisibleList:  input.isVisibleList ?? true,
          displayOrder:   input.displayOrder ?? 0,
          defaultValue:   input.defaultValue,
        },
        select: fieldSelect,
      });

      // Crear opciones si es DROPDOWN
      if (input.fieldType === 'DROPDOWN' && input.dropdownOptions?.length) {
        await tx.dropdownOption.createMany({
          data: input.dropdownOptions.map((opt, idx) => ({
            fieldId:      field.id,
            label:        opt.label,
            value:        opt.value,
            color:        opt.color,
            displayOrder: opt.displayOrder ?? idx,
          })),
        });
      }

      // Retornar con opciones incluidas
      return tx.customField.findUniqueOrThrow({
        where: { id: field.id },
        select: fieldSelect,
      });
    });
  },

  async update(fieldId: string, sectionId: string, input: UpdateCustomFieldInput) {
    const field = await db.customField.findFirst({
      where: { id: fieldId, sectionId, deletedAt: null },
    });
    if (!field) throw new AppError('Campo no encontrado', 404);

    return db.customField.update({
      where: { id: fieldId },
      data: {
        ...(input.label          !== undefined && { label: input.label }),
        ...(input.placeholder    !== undefined && { placeholder: input.placeholder }),
        ...(input.helpText       !== undefined && { helpText: input.helpText }),
        ...(input.isRequired     !== undefined && { isRequired: input.isRequired }),
        ...(input.isSearchable   !== undefined && { isSearchable: input.isSearchable }),
        ...(input.isVisibleList  !== undefined && { isVisibleList: input.isVisibleList }),
        ...(input.displayOrder   !== undefined && { displayOrder: input.displayOrder }),
        ...(input.defaultValue   !== undefined && { defaultValue: input.defaultValue }),
      },
      select: fieldSelect,
    });
  },

  async delete(fieldId: string, sectionId: string) {
    const field = await db.customField.findFirst({
      where: { id: fieldId, sectionId, deletedAt: null },
    });
    if (!field) throw new AppError('Campo no encontrado', 404);

    // Soft delete
    await db.customField.update({
      where: { id: fieldId },
      data: { deletedAt: new Date() },
    });

    // Limpiar valores de items para este campo
    await db.itemFieldValue.deleteMany({ where: { fieldId } });

    return { id: fieldId, name: field.name };
  },
};
