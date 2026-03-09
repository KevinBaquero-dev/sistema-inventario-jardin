// =============================================================================
// src/utils/slugify.ts
// Convierte texto a slug URL-friendly (usado en secciones y campos).
// =============================================================================

export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')                   // descomponer acentos: á → a + combining
    .replace(/[\u0300-\u036f]/g, '')    // eliminar diacríticos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')       // solo alfanumérico, espacios y guiones
    .replace(/\s+/g, '-')               // espacios → guión
    .replace(/-+/g, '-')                // múltiples guiones → uno
    .replace(/^-|-$/g, '');             // quitar guiones en extremos
}
