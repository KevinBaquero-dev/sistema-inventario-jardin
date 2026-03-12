// =============================================================================
// src/services/export.service.ts — Reportes institucionales Excel + PDF
// Diseño corporativo limpio, sin emojis, paleta profesional
// =============================================================================
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type { Response } from 'express';

type EJCell = ExcelJS.Cell;

// ─── Tipos ────────────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toNum(v: number | { toNumber?: () => number } | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return typeof v.toNumber === 'function' ? v.toNumber() : Number(v);
}
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDatetime(d: Date | string) {
  return new Date(d).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
function movTypeLabel(t: string): string {
  return ({ ENTRY: 'Entrada', EXIT: 'Salida', TRANSFER: 'Transferencia', ADJUSTMENT: 'Ajuste' } as Record<string,string>)[t] ?? t;
}
function stripEmoji(str: string): string {
  return str
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[^\x00-\x7E\u00C0-\u024F]/g, '')
    .trim();
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

// ─── Paleta ───────────────────────────────────────────────────────────────────
const XL = {
  navy:'FF1B2A4A', navyMid:'FF2D4A7A', slate:'FF4A7FB5', slateLight:'FFBDD5EA',
  accent:'FF2563EB', accentBg:'FFDBEAFE', white:'FFFFFFFF',
  gray50:'FFF8F9FB', gray100:'FFECEFF4', gray300:'FFBEC8D6',
  green:'FF15803D', greenBg:'FFF0FDF4', red:'FFB91C1C', redBg:'FFFEF2F2',
  blue:'FF1D4ED8',  blueBg:'FFEFF6FF',  amber:'FFB45309', amberBg:'FFFEFCE8',
  text:'FF0F172A',  textMid:'FF334155',  textLight:'FF64748B',
};
const PDF = {
  navy:'#1B2A4A', navyMid:'#2D4A7A', slate:'#4A7FB5', slateLight:'#BDD5EA',
  white:'#FFFFFF', gray50:'#F8F9FB', gray100:'#ECF0F4', gray200:'#D4DBE5',
  gray400:'#94A3B8', gray600:'#64748B', gray700:'#334155', text:'#0F172A',
  green:'#15803D', greenBg:'#F0FDF4', red:'#B91C1C', redBg:'#FEF2F2',
  blue:'#1D4ED8',  blueBg:'#EFF6FF',  amber:'#B45309', amberBg:'#FEFCE8',
};
const MOV_XL: Record<string,{bg:string;fg:string}> = {
  ENTRY:{bg:XL.greenBg,fg:XL.green}, EXIT:{bg:XL.redBg,fg:XL.red},
  TRANSFER:{bg:XL.blueBg,fg:XL.blue}, ADJUSTMENT:{bg:XL.amberBg,fg:XL.amber},
};
const MOV_PDF: Record<string,{bg:string;fg:string}> = {
  ENTRY:{bg:PDF.greenBg,fg:PDF.green}, EXIT:{bg:PDF.redBg,fg:PDF.red},
  TRANSFER:{bg:PDF.blueBg,fg:PDF.blue}, ADJUSTMENT:{bg:PDF.amberBg,fg:PDF.amber},
};

// =============================================================================
// EXCEL
// =============================================================================
function sc(cell: EJCell, o: {
  bg?:string; fg?:string; bold?:boolean; italic?:boolean;
  sz?:number; al?: ExcelJS.Alignment['horizontal']; border?:boolean;
}) {
  if (o.bg) cell.fill = { type:'pattern', pattern:'solid', fgColor:{argb:o.bg} };
  cell.font = { bold:o.bold??false, italic:o.italic??false, size:o.sz??10,
    color:{argb:o.fg??XL.text}, name:'Calibri' };
  if (o.al) cell.alignment = { horizontal:o.al, vertical:'middle' };
  if (o.border) cell.border = { bottom:{style:'thin', color:{argb:XL.gray300}} };
}

function addDetailSheet(
  wb: ExcelJS.Workbook, movements: ExportMovement[],
  customFields: SectionMeta['customFields'], sheetName: string,
  systemName: string, dateFrom: string, dateTo: string,
): void {
  const ws = wb.addWorksheet(stripEmoji(sheetName));
  const cfCols: Partial<ExcelJS.Column>[] = customFields.map(cf => ({
    header: cf.label, width: Math.max(cf.label.length + 6, 18),
  }));
  ws.columns = [
    {header:'Producto', width:34}, {header:'Sección', width:22},
    {header:'Tipo', width:16},     {header:'Cant.', width:10},
    {header:'Unidad', width:10},   {header:'Stock anterior', width:16},
    {header:'Stock posterior', width:17}, ...cfCols,
    {header:'Motivo', width:34},   {header:'Proveedor', width:24},
    {header:'Registrado por', width:26}, {header:'Fecha', width:22},
  ];

  const cols = ws.columns.length;
  // Fila 1 título
  ws.mergeCells(1,1,1,cols);
  sc(ws.getCell('A1'), {bg:XL.navy, fg:XL.white, bold:true, sz:13, al:'center'});
  ws.getCell('A1').value = systemName.toUpperCase();
  ws.getRow(1).height = 28;
  // Fila 2 período
  ws.mergeCells(2,1,2,cols);
  sc(ws.getCell('A2'), {bg:XL.navyMid, fg:XL.slateLight, sz:10, al:'center'});
  ws.getCell('A2').value = `Detalle de Movimientos  ·  Período: ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`;
  ws.getRow(2).height = 20;
  // Fila 3 sección
  ws.mergeCells(3,1,3,cols);
  sc(ws.getCell('A3'), {bg:XL.slateLight, fg:XL.navy, bold:true, sz:9, al:'center'});
  ws.getCell('A3').value = stripEmoji(sheetName) !== 'Detalle'
    ? `Sección: ${stripEmoji(sheetName)}` : 'Todas las secciones';
  ws.getRow(3).height = 16;
  ws.addRow([]); ws.getRow(4).height = 8;

  // Cabecera
  const baseCount = 7;
  const hdrRow = ws.getRow(5);
  hdrRow.values = [
    'Producto','Sección','Tipo','Cant.','Unidad','Stock anterior','Stock posterior',
    ...customFields.map(cf=>cf.label), 'Motivo','Proveedor','Registrado por','Fecha',
  ];
  hdrRow.eachCell((cell:EJCell, col) => {
    const isCF = col > baseCount && col <= baseCount + customFields.length;
    sc(cell, {bg: isCF ? XL.accent : XL.navy, fg:XL.white, bold:true, sz:10, al:'center'});
  });
  hdrRow.height = 24;

  // Datos
  let ri = 0;
  movements.forEach(m => {
    const qty  = Math.abs(toNum(m.quantityAfter)-toNum(m.quantityBefore));
    const cfVals = customFields.map(cf => getFieldValue(m, cf.slug));
    const row = ws.addRow([
      m.item.name, stripEmoji(m.item.section.name), movTypeLabel(m.movementType),
      qty, m.item.unit??'u', toNum(m.quantityBefore), toNum(m.quantityAfter),
      ...cfVals, m.reason??'', m.supplier?.name??'', m.createdBy.fullName,
      fmtDatetime(m.movementDate ?? m.createdAt),
    ]);
    const ts   = MOV_XL[m.movementType] ?? {bg:XL.white, fg:XL.text};
    const even = ri%2===0;
    row.height = 18;
    row.eachCell((cell:EJCell, col) => {
      const isT = col===3;
      const isCF = col > baseCount && col <= baseCount + customFields.length;
      sc(cell, {
        bg:   isT ? ts.bg : isCF ? (even ? XL.accentBg : XL.slateLight) : (even ? XL.gray50 : XL.white),
        fg:   isT ? ts.fg : isCF ? XL.accent : XL.textMid,
        bold: isT || isCF, sz:10,
        al:   (col>=4&&col<=7) ? 'center' : 'left',
        border: true,
      });
    });
    ri++;
  });

  ws.addRow([]);
  const tot = ws.addRow([`Total de registros: ${movements.length}`]);
  sc(tot.getCell(1), {bg:XL.slateLight, fg:XL.navy, bold:true, sz:10});
  ws.mergeCells(tot.number,1,tot.number,cols);
}

export async function generateExcel(params: ExportParams): Promise<Buffer> {
  const { movements, summary, sections=[], dateFrom, dateTo, sectionName, systemName='Inventario Jardín' } = params;
  const wb = new ExcelJS.Workbook();
  wb.creator = systemName; wb.created = new Date(); wb.modified = new Date();

  // Hoja resumen
  const ws = wb.addWorksheet('Resumen');
  ws.columns = [{width:28},{width:22},{width:22},{width:20}];

  ws.mergeCells('A1:D1');
  sc(ws.getCell('A1'), {bg:XL.navy, fg:XL.white, bold:true, sz:14, al:'center'});
  ws.getCell('A1').value = systemName.toUpperCase();
  ws.getRow(1).height = 30;

  ws.mergeCells('A2:D2');
  sc(ws.getCell('A2'), {bg:XL.navyMid, fg:XL.slateLight, sz:10, al:'center'});
  ws.getCell('A2').value = 'Reporte de Movimientos de Inventario';
  ws.getRow(2).height = 20;

  ws.mergeCells('A3:D3');
  sc(ws.getCell('A3'), {bg:XL.slateLight, fg:XL.navy, bold:true, sz:9, al:'center'});
  ws.getCell('A3').value =
    `Período: ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}` +
    (sectionName ? `   ·   Sección: ${stripEmoji(sectionName)}` : '   ·   Todas las secciones') +
    `   ·   Generado: ${fmtDatetime(new Date())}`;
  ws.getRow(3).height = 16;
  ws.addRow([]); ws.getRow(4).height = 8;

  const hdr = ws.getRow(5);
  hdr.values = ['Tipo de Movimiento','Cantidad de Registros','Unidades Totales','Costo Total'];
  hdr.height = 24;
  hdr.eachCell((cell:EJCell) => sc(cell,{bg:XL.navy,fg:XL.white,bold:true,sz:11,al:'center'}));

  let i = 0;
  Object.entries(summary).forEach(([type, s]) => {
    const row = ws.addRow([movTypeLabel(type), s.count, s.totalQuantity, s.totalCost>0?s.totalCost:0]);
    row.height = 20;
    const ts   = MOV_XL[type] ?? {bg:XL.white,fg:XL.text};
    const even = i%2===0;
    sc(row.getCell(1), {bg:ts.bg, fg:ts.fg, bold:true, sz:11, al:'left', border:true});
    sc(row.getCell(2), {bg:even?XL.gray50:XL.white, fg:XL.textMid, sz:11, al:'center', border:true});
    sc(row.getCell(3), {bg:even?XL.gray50:XL.white, fg:XL.textMid, sz:11, al:'center', border:true});
    sc(row.getCell(4), {bg:even?XL.gray50:XL.white, fg:XL.textMid, sz:11, al:'right',  border:true});
    if (s.totalCost>0) row.getCell(4).numFmt = '#,##0';
    i++;
  });

  ws.addRow([]);
  const tot = ws.addRow(['Total de movimientos', movements.length]);
  tot.height = 22;
  sc(tot.getCell(1), {bg:XL.slateLight, fg:XL.navy, bold:true, sz:11});
  sc(tot.getCell(2), {bg:XL.slateLight, fg:XL.navy, bold:true, sz:12, al:'center'});

  const isSingle = !!sectionName || sections.length <= 1;
  if (isSingle) {
    addDetailSheet(wb, movements, sections[0]?.customFields??[], 'Detalle', systemName, dateFrom, dateTo);
  } else {
    const bySection = new Map<string, ExportMovement[]>();
    movements.forEach(m => {
      if (!bySection.has(m.item.section.id)) bySection.set(m.item.section.id, []);
      bySection.get(m.item.section.id)!.push(m);
    });
    sections.forEach(sec => {
      const secMovs = bySection.get(sec.id) ?? [];
      if (secMovs.length>0) addDetailSheet(wb, secMovs, sec.customFields, stripEmoji(sec.name).slice(0,28), systemName, dateFrom, dateTo);
    });
    const listed = new Set(sections.map(s=>s.id));
    const others = movements.filter(m=>!listed.has(m.item.section.id));
    if (others.length>0) addDetailSheet(wb, others, [], 'Otras', systemName, dateFrom, dateTo);
  }

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

// =============================================================================
// PDF
// =============================================================================
export function generatePDF(params: ExportParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { movements, summary, sections=[], dateFrom, dateTo, sectionName, systemName='Inventario Jardín' } = params;
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size:'A4', layout:'landscape', margin:0, bufferPages:true });
    doc.on('data', (c:Buffer) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W=doc.page.width, H=doc.page.height, ML=36;

    function rule(y:number, color=PDF.gray200, w=0.5) {
      doc.save().moveTo(ML,y).lineTo(W-ML,y).lineWidth(w).strokeColor(color).stroke().restore();
    }

    function pageHeader(isFirst:boolean) {
      doc.rect(0,0,W,42).fill(PDF.navy);
      doc.rect(0,42,W,3).fill(PDF.slate);
      doc.fill(PDF.white).font('Helvetica-Bold').fontSize(15)
        .text(systemName.toUpperCase(), ML, 12, {lineBreak:false});
      doc.fill(PDF.slateLight).font('Helvetica').fontSize(8.5)
        .text('REPORTE DE MOVIMIENTOS DE INVENTARIO', W-ML-240, 10, {width:240, align:'right', lineBreak:false});
      doc.fill(PDF.gray400).font('Helvetica').fontSize(7.5)
        .text(`Generado: ${fmtDatetime(new Date())}`, W-ML-240, 22, {width:240, align:'right', lineBreak:false});
      if (isFirst) {
        doc.rect(0,45,W,22).fill(PDF.gray50);
        rule(45, PDF.gray200, 0.5); rule(67, PDF.gray200, 0.5);
        doc.fill(PDF.navy).font('Helvetica-Bold').fontSize(8)
          .text(`Período:  ${fmtDate(dateFrom)}  —  ${fmtDate(dateTo)}`, ML, 52, {lineBreak:false});
        doc.fill(PDF.gray700).font('Helvetica').fontSize(8)
          .text(sectionName ? `Sección:  ${stripEmoji(sectionName)}` : 'Alcance:  Todas las secciones', ML+220, 52, {lineBreak:false});
        doc.fill(PDF.slate).font('Helvetica-Bold').fontSize(8)
          .text(`Total:  ${movements.length} movimientos`, W-ML-180, 52, {width:180, align:'right', lineBreak:false});
      }
    }

    function drawSummary(y:number): number {
      doc.rect(ML,y,W-ML*2,20).fill(PDF.navyMid);
      doc.fill(PDF.white).font('Helvetica-Bold').fontSize(9)
        .text('RESUMEN EJECUTIVO', ML+10, y+6, {lineBreak:false});
      y+=20;
      const cw=[160,100,100,120];
      const hdrs=['Tipo de Movimiento','Registros','Unidades Totales','Costo Total'];
      const tw=cw.reduce((a,b)=>a+b,0);
      doc.rect(ML,y,tw,18).fill(PDF.navy);
      let sx=ML;
      hdrs.forEach((h,i) => {
        doc.fill(PDF.white).font('Helvetica-Bold').fontSize(8)
          .text(h, sx+8, y+5, {width:cw[i]-10, lineBreak:false});
        sx+=cw[i];
      });
      y+=18;
      let idx=0;
      Object.entries(summary).forEach(([type,s]) => {
        const even=idx%2===0;
        const ts=MOV_PDF[type]??{bg:PDF.gray50,fg:PDF.text};
        doc.rect(ML,y,cw[0],16).fill(ts.bg);
        doc.rect(ML+cw[0],y,tw-cw[0],16).fill(even?PDF.gray50:PDF.white);
        sx=ML;
        const cells=[movTypeLabel(type),String(s.count),String(s.totalQuantity),s.totalCost>0?`$${s.totalCost.toLocaleString('es-CL')}`:'—'];
        cells.forEach((c,i) => {
          doc.fill(i===0?ts.fg:PDF.gray700).font(i===0?'Helvetica-Bold':'Helvetica').fontSize(8.5)
            .text(c, sx+8, y+4, {width:cw[i]-10, lineBreak:false});
          sx+=cw[i];
        });
        rule(y+16, PDF.gray200, 0.3);
        y+=16; idx++;
      });
      doc.rect(ML,y,tw,18).fill(PDF.slateLight);
      doc.fill(PDF.navy).font('Helvetica-Bold').fontSize(9)
        .text(`Total de movimientos: ${movements.length}`, ML+10, y+5, {lineBreak:false});
      return y+18+14;
    }

    function drawTable(movs:ExportMovement[], cfs:SectionMeta['customFields'], sy:number): number {
      const ROW=14, HDR=18, BOT=30;
      const cfN=cfs.length;
      const cfW=cfN>0?Math.min(70,Math.floor((W-ML*2)*0.25/cfN)):0;
      let bw=[120,80,72,32,32,56,90,58];
      if (cfW*cfN>0) {
        const s=cfW*cfN;
        bw[0]=Math.max(80,bw[0]-s*0.55);
        bw[1]=Math.max(55,bw[1]-s*0.45);
      }
      const aw=[...bw.slice(0,5),...Array(cfN).fill(cfW),...bw.slice(5)];
      const tw=aw.reduce((a,b)=>a+b,0);
      const hdrs=['Producto','Sección','Tipo','Cant.','Unid.',...cfs.map(c=>stripEmoji(c.label).slice(0,12)),'Stock','Registrado por','Fecha'];
      let y=sy;

      const drawHdr=()=>{
        doc.rect(ML,y,tw,HDR).fill(PDF.navy);
        doc.rect(ML,y+HDR,tw,1).fill(PDF.slate);
        let sx=ML;
        hdrs.forEach((h,i)=>{
          const isCF=i>=5&&i<5+cfN;
          doc.fill(isCF?'#93C5FD':PDF.slateLight).font('Helvetica-Bold').fontSize(7)
            .text(h, sx+4, y+6, {width:aw[i]-6, ellipsis:true, lineBreak:false});
          sx+=aw[i];
        });
        y+=HDR+1;
      };
      drawHdr();

      movs.forEach((m,ri)=>{
        if (y+ROW>H-BOT) { doc.addPage(); pageHeader(false); y=55; drawHdr(); }
        const qty=Math.abs(toNum(m.quantityAfter)-toNum(m.quantityBefore));
        const cfVals=cfs.map(cf=>getFieldValue(m,cf.slug));
        const cells=[
          stripEmoji(m.item.name), stripEmoji(m.item.section.name), movTypeLabel(m.movementType),
          String(qty), m.item.unit??'u', ...cfVals,
          `${toNum(m.quantityBefore)} → ${toNum(m.quantityAfter)}`,
          m.createdBy.fullName.split(' ').slice(0,2).join(' '),
          fmtDate(m.movementDate??m.createdAt),
        ];
        const even=ri%2===0;
        const ts=MOV_PDF[m.movementType]??{bg:PDF.gray50,fg:PDF.gray700};
        doc.rect(ML,y,tw,ROW).fill(even?PDF.gray50:PDF.white);
        doc.rect(ML+aw[0]+aw[1],y,aw[2],ROW).fill(ts.bg);
        let sx=ML;
        cells.forEach((c,i)=>{
          const isT=i===2;
          const isCF=i>=5&&i<5+cfN;
          if(isCF) doc.rect(sx,y,aw[i],ROW).fill(even?PDF.blueBg:'#F5F9FF');
          doc.fill(isT?ts.fg:isCF?PDF.blue:PDF.gray700)
            .font(isT||isCF?'Helvetica-Bold':'Helvetica').fontSize(7)
            .text(c, sx+4, y+4, {width:aw[i]-6, ellipsis:true, lineBreak:false});
          sx+=aw[i];
        });
        if(ri%2===1) rule(y+ROW,PDF.gray200,0.25);
        y+=ROW;
      });
      rule(y,PDF.slate,1);
      return y;
    }

    // ── Construir doc ──────────────────────────────────────────────────────────
    pageHeader(true);
    let y=78;
    y=drawSummary(y);

    y+=4;
    doc.rect(ML,y,W-ML*2,20).fill(PDF.navyMid);
    doc.fill(PDF.white).font('Helvetica-Bold').fontSize(9)
      .text('DETALLE DE MOVIMIENTOS', ML+10, y+6, {lineBreak:false});
    y+=24;

    const isSingle=!!sectionName||sections.length<=1;
    if (isSingle) {
      const cfs=sections[0]?.customFields??[];
      if (cfs.length>0) {
        doc.fill(PDF.slate).font('Helvetica').fontSize(7.5)
          .text(`Campos personalizados incluidos: ${cfs.map(c=>stripEmoji(c.label)).join(' · ')}`, ML, y, {lineBreak:false});
        y+=12;
      }
      drawTable(movements, cfs, y);
    } else {
      const bySec=new Map<string,ExportMovement[]>();
      movements.forEach(m=>{
        if(!bySec.has(m.item.section.id)) bySec.set(m.item.section.id,[]);
        bySec.get(m.item.section.id)!.push(m);
      });
      sections.forEach(sec=>{
        const movs=bySec.get(sec.id)??[];
        if(!movs.length) return;
        if(y>H-120){doc.addPage();pageHeader(false);y=55;}
        const name=stripEmoji(sec.name);
        doc.rect(ML,y,W-ML*2,22).fillOpacity(0.12).fill(PDF.slate).fillOpacity(1);
        doc.save().moveTo(ML,y).lineTo(ML,y+22).lineWidth(4).strokeColor(PDF.slate).stroke().restore();
        doc.fill(PDF.navy).font('Helvetica-Bold').fontSize(10)
          .text(name.toUpperCase(), ML+12, y+6, {lineBreak:false});
        doc.fill(PDF.gray600).font('Helvetica').fontSize(8)
          .text(`${movs.length} movimientos`, W-ML-120, y+7, {width:120, align:'right', lineBreak:false});
        y+=26;
        if(sec.customFields.length>0){
          doc.fill(PDF.slate).font('Helvetica').fontSize(7.5)
            .text(`Campos: ${sec.customFields.map(c=>stripEmoji(c.label)).join(' · ')}`, ML+8, y, {lineBreak:false});
          y+=12;
        }
        y=drawTable(movs, sec.customFields, y)+20;
      });
    }

    // Footer
    const total=doc.bufferedPageRange().count;
    for(let i=0;i<total;i++){
      doc.switchToPage(i);
      doc.rect(0,H-22,W,22).fill(PDF.navy);
      doc.fill(PDF.slateLight).font('Helvetica').fontSize(7)
        .text(`${systemName}   ·   Reporte de Movimientos   ·   ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`, ML, H-15, {lineBreak:false});
      doc.fill(PDF.gray400).font('Helvetica').fontSize(7)
        .text(`Página ${i+1} de ${total}`, W-ML-80, H-15, {width:80, align:'right', lineBreak:false});
    }
    doc.end();
  });
}

// ─── Helpers controllers ──────────────────────────────────────────────────────
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
