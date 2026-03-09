// =============================================================================
// src/services/export.service.ts — Excel + PDF con campos personalizados
// =============================================================================
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type { Response } from 'express';

type EJCell = ExcelJS.Cell;

export interface FieldValueEntry {
  valueText?:    string | null;
  valueNumber?:  { toNumber?: () => number } | number | null;
  valueDate?:    Date | string | null;
  valueBoolean?: boolean | null;
  field: { label: string; fieldType: string; slug: string; displayOrder: number };
}

export interface ExportMovement {
  movementType:   string;
  movementDate:   Date | string;
  createdAt:      Date | string;
  quantity:       number | { toNumber?: () => number };
  quantityBefore: number | { toNumber?: () => number };
  quantityAfter:  number | { toNumber?: () => number };
  totalCost?:     number | { toNumber?: () => number } | null;
  reason?:        string | null;
  notes?:         string | null;
  item: {
    name: string; unit?: string | null;
    section: { id: string; name: string; color?: string | null };
    fieldValues?: FieldValueEntry[];
  };
  createdBy: { fullName: string };
  supplier?:  { name: string } | null;
}

export interface SectionMeta {
  id: string; name: string; color?: string | null; icon?: string | null;
  customFields: { id: string; label: string; fieldType: string; slug: string; displayOrder: number }[];
}

export interface ExportParams {
  movements:    ExportMovement[];
  summary:      Record<string, { count: number; totalQuantity: number; totalCost: number }>;
  sections?:    SectionMeta[];
  dateFrom:     string;
  dateTo:       string;
  sectionName?: string;
  systemName?:  string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function toNum(v: number | { toNumber?: () => number } | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return typeof v.toNumber === 'function' ? v.toNumber() : Number(v);
}
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDatetime(d: Date | string) {
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function movTypeLabel(t: string) {
  return ({ ENTRY: 'Entrada', EXIT: 'Salida', TRANSFER: 'Transferencia', ADJUSTMENT: 'Ajuste' })[t] ?? t;
}
function fieldValueText(fv: FieldValueEntry): string {
  const ft = fv.field.fieldType;
  if (ft === 'BOOLEAN') return fv.valueBoolean != null ? (fv.valueBoolean ? 'Sí' : 'No') : '';
  if (ft === 'NUMBER')  return fv.valueNumber  != null ? String(toNum(fv.valueNumber as number)) : '';
  if (ft === 'DATE')    return fv.valueDate    != null ? fmtDate(fv.valueDate as string) : '';
  return fv.valueText ?? '';
}
function getFieldValue(m: ExportMovement, slug: string): string {
  const fv = m.item.fieldValues?.find(f => f.field.slug === slug);
  return fv ? fieldValueText(fv) : '';
}

const TYPE_ROW_COLOR: Record<string, string> = {
  ENTRY: 'FFF0FDF4', EXIT: 'FFFFF5F5', TRANSFER: 'FFEFF6FF', ADJUSTMENT: 'FFFEFCE8',
};

// =============================================================================
// EXCEL
// =============================================================================
function addDetailSheet(
  wb: ExcelJS.Workbook,
  movements: ExportMovement[],
  customFields: SectionMeta['customFields'],
  sheetName: string
): void {
  const ws = wb.addWorksheet(sheetName);
  const cfCols: Partial<ExcelJS.Column>[] = customFields.map(cf => ({
    header: cf.label, width: Math.max(cf.label.length + 4, 16),
  }));
  ws.columns = [
    { header: 'Producto',      width: 30 },
    { header: 'Sección',       width: 20 },
    { header: 'Tipo',          width: 18 },
    { header: 'Cantidad',      width: 12 },
    { header: 'Unidad',        width: 10 },
    { header: 'Stock antes',   width: 14 },
    { header: 'Stock después', width: 16 },
    ...cfCols,
    { header: 'Razón',     width: 32 },
    { header: 'Proveedor', width: 24 },
    { header: 'Usuario',   width: 24 },
    { header: 'Fecha',     width: 20 },
  ];

  const hdr = ws.getRow(1);
  hdr.eachCell((cell: EJCell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1B2A' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { horizontal: 'left' };
  });
  if (cfCols.length > 0) {
    const cfStart = 8; // columna 8 en 1-based
    for (let col = cfStart; col < cfStart + cfCols.length; col++) {
      const cell = hdr.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D6A4F' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, italic: true };
    }
  }
  hdr.height = 22;

  movements.forEach(m => {
    const qty    = Math.abs(toNum(m.quantityAfter) - toNum(m.quantityBefore));
    const cfVals = customFields.map(cf => getFieldValue(m, cf.slug));
    const row = ws.addRow([
      m.item.name, m.item.section.name, movTypeLabel(m.movementType),
      qty, m.item.unit ?? 'u', toNum(m.quantityBefore), toNum(m.quantityAfter),
      ...cfVals,
      m.reason ?? '', m.supplier?.name ?? '', m.createdBy.fullName,
      fmtDatetime(m.movementDate ?? m.createdAt),
    ]);
    const bg = TYPE_ROW_COLOR[m.movementType] ?? 'FFFFFFFF';
    row.eachCell((cell: EJCell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    });
  });
}

export async function generateExcel(params: ExportParams): Promise<Buffer> {
  const { movements, summary, sections = [], dateFrom, dateTo, sectionName, systemName = 'Inventario Jardín' } = params;

  const wb = new ExcelJS.Workbook();
  wb.creator = systemName; wb.created = new Date();

  // Hoja Resumen
  const wsRes = wb.addWorksheet('Resumen');
  wsRes.columns = [{ width: 26 }, { width: 28 }, { width: 22 }, { width: 18 }];
  wsRes.mergeCells('A1:D1');
  const t = wsRes.getCell('A1'); t.value = systemName;
  t.font = { bold: true, size: 14, color: { argb: 'FF0D1B2A' } };
  wsRes.mergeCells('A2:D2');
  wsRes.getCell('A2').value = `Período: ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`;
  wsRes.getCell('A2').font = { size: 11, color: { argb: 'FF415A77' } };
  wsRes.mergeCells('A3:D3');
  wsRes.getCell('A3').value = sectionName ? `Sección: ${sectionName}` : 'Todas las secciones';
  wsRes.getCell('A3').font = { size: 10, color: { argb: 'FF778DA9' } };
  wsRes.addRow([]);

  const hdrRes = wsRes.addRow(['Tipo', 'N° movimientos', 'Unidades totales', 'Costo total']);
  hdrRes.eachCell((cell: EJCell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF415A77' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { horizontal: 'left' };
  });
  hdrRes.height = 22;
  Object.entries(summary).forEach(([type, s], i) => {
    const row = wsRes.addRow([movTypeLabel(type), s.count, s.totalQuantity, s.totalCost]);
    if (i % 2 === 0) row.eachCell((cell: EJCell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
    });
  });
  wsRes.addRow([]);
  const totRow = wsRes.addRow(['Total movimientos', movements.length]);
  totRow.getCell(1).font = { bold: true };
  totRow.getCell(2).font = { bold: true, color: { argb: 'FF0D1B2A' } };

  // Hojas de detalle
  const isSingle = !!sectionName || sections.length <= 1;
  if (isSingle) {
    addDetailSheet(wb, movements, sections[0]?.customFields ?? [], 'Detalle');
  } else {
    const bySection = new Map<string, ExportMovement[]>();
    movements.forEach(m => {
      const sid = m.item.section.id;
      if (!bySection.has(sid)) bySection.set(sid, []);
      bySection.get(sid)!.push(m);
    });
    sections.forEach(sec => {
      const secMovs = bySection.get(sec.id) ?? [];
      if (secMovs.length > 0) addDetailSheet(wb, secMovs, sec.customFields, sec.name.slice(0, 28));
    });
    const listed  = new Set(sections.map(s => s.id));
    const others  = movements.filter(m => !listed.has(m.item.section.id));
    if (others.length > 0) addDetailSheet(wb, others, [], 'Otras');
  }

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

// =============================================================================
// PDF
// =============================================================================
export function generatePDF(params: ExportParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { movements, summary, sections = [], dateFrom, dateTo, sectionName, systemName = 'Inventario Jardín' } = params;
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28, bufferPages: true });
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width; const M = 28;
    const DARK = '#0D1B2A'; const MID = '#415A77'; const LIGHT = '#9DB5C8';
    const WHITE = '#FFFFFF'; const GREEN = '#166534'; const RED = '#C53030'; const TEAL = '#2D6A4F';

    function pageHeader(isFirst: boolean) {
      doc.rect(0, 0, W, 36).fill(DARK);
      doc.fill(WHITE).font('Helvetica-Bold').fontSize(13).text(systemName, M, 11);
      doc.fill('#8BA7C4').font('Helvetica').fontSize(8)
        .text('Reporte de Movimientos', W - M - 150, 14, { width: 150, align: 'right' });
      if (isFirst) {
        doc.fill(MID).font('Helvetica').fontSize(8.5).text(
          `Período: ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}` +
          (sectionName ? `  |  Sección: ${sectionName}` : '  |  Todas las secciones') +
          `  |  ${movements.length} movimientos  |  ${fmtDatetime(new Date())}`,
          M, 42, { width: W - M * 2 }
        );
      }
    }

    function drawSummary(y: number): number {
      doc.fill(DARK).font('Helvetica-Bold').fontSize(10).text('Resumen por tipo', M, y); y += 14;
      const cols = [110, 80, 80, 90]; const hdrs = ['Tipo', 'Movimientos', 'Unidades', 'Costo total'];
      let sx = M;
      doc.rect(sx, y, cols.reduce((a,b)=>a+b,0), 17).fill(MID);
      hdrs.forEach((h,i) => { doc.fill(WHITE).font('Helvetica-Bold').fontSize(8.5).text(h,sx+5,y+5,{width:cols[i]-8}); sx+=cols[i]; });
      y += 17;
      Object.entries(summary).forEach(([type, s], idx) => {
        sx = M;
        doc.rect(sx, y, cols.reduce((a,b)=>a+b,0), 15).fill(idx%2===0?'#F9FAFB':WHITE);
        const cells = [movTypeLabel(type), String(s.count), String(s.totalQuantity), s.totalCost>0?`$${s.totalCost.toLocaleString('es-CL')}`:'—'];
        cells.forEach((c,i) => { doc.fill(DARK).font(i===0?'Helvetica-Bold':'Helvetica').fontSize(8.5).text(c,sx+5,y+4,{width:cols[i]-8}); sx+=cols[i]; });
        y += 15;
      });
      return y + 16;
    }

    function drawDetailTable(movs: ExportMovement[], cfs: SectionMeta['customFields'], startY: number): number {
      const pageH = doc.page.height; const BOTTOM = 34; const rowH = 13;
      const cfCount = cfs.length;
      const availW = W - M * 2;
      const cfColW = cfCount > 0 ? Math.min(65, Math.floor((availW * 0.3) / cfCount)) : 0;
      let bw = [118, 75, 68, 34, 32, 50, 82, 56];
      if (cfColW * cfCount > 0) {
        const sh = (cfColW * cfCount) / 2;
        bw[0] = Math.max(75, bw[0] - sh * 0.6);
        bw[1] = Math.max(50, bw[1] - sh * 0.4);
      }
      const allW = [...bw.slice(0,5), ...Array(cfCount).fill(cfColW), ...bw.slice(5)];
      const totalW = allW.reduce((a,b)=>a+b,0);
      const baseHdrs = ['Producto','Sección','Tipo','Cant.','Unid.',...cfs.map(c=>c.label.slice(0,11)),'Stock','Usuario','Fecha'];
      let y = startY;

      const drawHdr = () => {
        let sx = M;
        doc.rect(sx, y, totalW, 16).fill(DARK);
        baseHdrs.forEach((h,i) => {
          const isCF = i>=5 && i<5+cfCount;
          doc.fill(isCF?'#A8D5BE':WHITE).font('Helvetica-Bold').fontSize(7)
            .text(h,sx+3,y+5,{width:allW[i]-5,ellipsis:true,lineBreak:false});
          sx+=allW[i];
        });
        y += 16;
      };
      drawHdr();

      const tBg: Record<string,string> = { ENTRY:'#F0FDF4',EXIT:'#FFF5F5',TRANSFER:'#EFF6FF',ADJUSTMENT:'#FEFCE8' };
      const tFg: Record<string,string> = { ENTRY:GREEN, EXIT:RED, TRANSFER:'#1D4ED8', ADJUSTMENT:'#92400E' };

      movs.forEach(m => {
        if (y + rowH > pageH - BOTTOM) {
          doc.addPage(); pageHeader(false); y = 44; drawHdr();
        }
        const qty = Math.abs(toNum(m.quantityAfter)-toNum(m.quantityBefore));
        const cfVals = cfs.map(cf => getFieldValue(m, cf.slug));
        const cells = [
          m.item.name, m.item.section.name, movTypeLabel(m.movementType),
          String(qty), m.item.unit??'u', ...cfVals,
          `${toNum(m.quantityBefore)}→${toNum(m.quantityAfter)}`,
          m.createdBy.fullName.split(' ').slice(0,2).join(' '),
          fmtDate(m.movementDate??m.createdAt),
        ];
        let sx = M;
        doc.rect(sx, y, totalW, rowH).fill(tBg[m.movementType]??'#F9FAFB');
        cells.forEach((c,i) => {
          const isT = i===2; const isCF = i>=5&&i<5+cfCount;
          doc.fill(isT?tFg[m.movementType]??DARK:isCF?TEAL:DARK)
            .font(isT||isCF?'Helvetica-Bold':'Helvetica').fontSize(7)
            .text(c,sx+3,y+3,{width:allW[i]-5,ellipsis:true,lineBreak:false});
          sx+=allW[i];
        });
        y += rowH;
      });
      return y;
    }

    // Construir doc
    pageHeader(true);
    let y = 56;
    y = drawSummary(y);

    const isSingle = !!sectionName || sections.length <= 1;
    if (isSingle) {
      const cfs = sections[0]?.customFields ?? [];
      doc.fill(DARK).font('Helvetica-Bold').fontSize(10).text('Detalle de movimientos', M, y);
      if (cfs.length > 0) doc.fill(TEAL).font('Helvetica').fontSize(7.5)
        .text(`  Campos personalizados: ${cfs.map(c=>c.label).join(', ')}`, M+165, y+2);
      y += 13;
      drawDetailTable(movements, cfs, y);
    } else {
      const bySection = new Map<string, ExportMovement[]>();
      movements.forEach(m => {
        if (!bySection.has(m.item.section.id)) bySection.set(m.item.section.id, []);
        bySection.get(m.item.section.id)!.push(m);
      });
      sections.forEach(sec => {
        const secMovs = bySection.get(sec.id) ?? [];
        if (!secMovs.length) return;
        if (y > 260) { doc.addPage(); pageHeader(false); y = 44; }
        // Banner de sección
        doc.rect(M, y, W-M*2, 19).fill((sec.color??MID)+'25');
        doc.fill(sec.color??MID).font('Helvetica-Bold').fontSize(11)
          .text(`${sec.icon??'📦'} ${sec.name}`, M+8, y+4);
        doc.fill(LIGHT).font('Helvetica').fontSize(8)
          .text(`${secMovs.length} movimientos`, W-M-70, y+5, {width:70,align:'right'});
        y += 22;
        if (sec.customFields.length > 0) {
          doc.fill(TEAL).font('Helvetica').fontSize(7.5)
            .text(`Campos: ${sec.customFields.map(c=>c.label).join(', ')}`, M+4, y);
          y += 12;
        }
        y = drawDetailTable(secMovs, sec.customFields, y) + 18;
      });
    }

    // Footer
    const total = doc.bufferedPageRange().count;
    for (let i=0;i<total;i++) {
      doc.switchToPage(i);
      doc.fill(LIGHT).font('Helvetica').fontSize(7.5)
        .text(`${systemName} — Página ${i+1} de ${total}   |   ${fmtDatetime(new Date())}`,
          M, doc.page.height-16, {width:W-M*2,align:'center'});
    }
    doc.end();
  });
}

export async function sendExcel(res: Response, params: ExportParams): Promise<void> {
  const buf = await generateExcel(params);
  const fn  = `reporte-movimientos_${params.dateFrom}_${params.dateTo}.xlsx`;
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition',`attachment; filename="${fn}"`);
  res.setHeader('Content-Length', buf.length);
  res.end(buf);
}

export async function sendPDF(res: Response, params: ExportParams): Promise<void> {
  const buf = await generatePDF(params);
  const fn  = `reporte-movimientos_${params.dateFrom}_${params.dateTo}.pdf`;
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition',`attachment; filename="${fn}"`);
  res.setHeader('Content-Length', buf.length);
  res.end(buf);
}
