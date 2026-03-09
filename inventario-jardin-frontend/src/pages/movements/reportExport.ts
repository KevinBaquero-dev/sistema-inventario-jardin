// =============================================================================
// src/pages/movements/reportExport.ts
// Utilidades para exportar reportes en PDF y Excel
// =============================================================================
import type { Movement } from '../../types'
import type { ReportSummaryEntry } from '../../api/movements.api'

interface ExportParams {
  movements: Movement[]
  summary: Record<string, ReportSummaryEntry>
  dateFrom: string
  dateTo: string
  sectionName?: string
  systemName?: string
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fmtDatetime(d: string) {
  return new Date(d).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function movTypeLabel(t: string) {
  const map: Record<string, string> = {
    ENTRY: 'Entrada', EXIT: 'Salida',
    TRANSFER: 'Transferencia', ADJUSTMENT: 'Ajuste',
  }
  return map[t] ?? t
}

// ── Helpers para acceder a campos embebidos ──────────────────────────────────
function getItem(m: Movement) {
  return (m as unknown as { item?: { name?: string; unit?: string; section?: { name?: string } } }).item
}
function getUser(m: Movement) {
  return (m as unknown as { createdBy?: { fullName?: string } }).createdBy
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT EXCEL  (usa ExcelJS — sin vulnerabilidades)
// ═══════════════════════════════════════════════════════════════════════════
export async function exportToExcel(params: ExportParams) {
  const { movements, summary, dateFrom, dateTo, sectionName, systemName = 'Inventario Jardín' } = params

  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator  = systemName
  wb.created  = new Date()

  // ── Hoja 1: Resumen ──────────────────────────────────────────────────────
  const ws1 = wb.addWorksheet('Resumen')
  ws1.columns = [
    { width: 26 }, { width: 28 }, { width: 22 }, { width: 18 },
  ]

  // Título
  ws1.mergeCells('A1:D1')
  const titleCell = ws1.getCell('A1')
  titleCell.value = systemName
  titleCell.font  = { bold: true, size: 14, color: { argb: 'FF0D1B2A' } }
  titleCell.alignment = { horizontal: 'left' }

  ws1.mergeCells('A2:D2')
  ws1.getCell('A2').value = `Período: ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`
  ws1.getCell('A2').font  = { size: 11, color: { argb: 'FF415A77' } }

  ws1.mergeCells('A3:D3')
  ws1.getCell('A3').value = sectionName ? `Sección: ${sectionName}` : 'Todas las secciones'
  ws1.getCell('A3').font  = { size: 10, color: { argb: 'FF778DA9' } }

  ws1.addRow([])

  // Encabezado de tabla
  const hdrRow = ws1.addRow(['Tipo', 'N° movimientos', 'Unidades totales', 'Costo total'])
  hdrRow.eachCell(cell => {
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF415A77' } }
    cell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.alignment = { horizontal: 'left' }
  })

  // Datos
  Object.entries(summary).forEach(([type, s], i) => {
    const row = ws1.addRow([movTypeLabel(type), s.count, s.totalQuantity, s.totalCost])
    if (i % 2 === 0) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }
      })
    }
  })

  ws1.addRow([])
  const totalRow = ws1.addRow(['Total movimientos', movements.length, '', ''])
  totalRow.getCell(1).font = { bold: true, color: { argb: 'FF0D1B2A' } }
  totalRow.getCell(2).font = { bold: true, color: { argb: 'FF0D1B2A' } }

  // ── Hoja 2: Detalle ──────────────────────────────────────────────────────
  const ws2 = wb.addWorksheet('Detalle')
  ws2.columns = [
    { header: 'Producto',       width: 30 },
    { header: 'Sección',        width: 20 },
    { header: 'Tipo',           width: 18 },
    { header: 'Cantidad',       width: 12 },
    { header: 'Unidad',         width: 10 },
    { header: 'Stock antes',    width: 14 },
    { header: 'Stock después',  width: 16 },
    { header: 'Razón',          width: 32 },
    { header: 'Usuario',        width: 24 },
    { header: 'Fecha',          width: 20 },
  ]

  // Estilo del encabezado
  const hdr2 = ws2.getRow(1)
  hdr2.eachCell(cell => {
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1B2A' } }
    cell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.alignment = { horizontal: 'left' }
  })
  hdr2.height = 22

  // Colores por tipo de movimiento
  const typeColors: Record<string, string> = {
    Entrada: 'FFF0FDF4', Salida: 'FFFFF5F5',
    Transferencia: 'FFEFF6FF', Ajuste: 'FFFEFCE8',
  }

  movements.forEach((m, i) => {
    const item   = getItem(m)
    const user   = getUser(m)
    const qty    = Math.abs(Number(m.quantityAfter) - Number(m.quantityBefore))
    const tipo   = movTypeLabel(m.movementType)
    const row    = ws2.addRow([
      item?.name          ?? '',
      item?.section?.name ?? '',
      tipo,
      qty,
      item?.unit          ?? 'u',
      Number(m.quantityBefore),
      Number(m.quantityAfter),
      (m as unknown as { reason?: string }).reason ?? '',
      user?.fullName      ?? '',
      fmtDatetime(m.movementDate ?? m.createdAt),
    ])
    const bg = typeColors[tipo] ?? (i % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF')
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
    })
  })

  // Descargar desde el navegador
  const buffer   = await wb.xlsx.writeBuffer()
  const blob     = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url      = URL.createObjectURL(blob)
  const a        = document.createElement('a')
  a.href         = url
  a.download     = `reporte-movimientos_${dateFrom}_${dateTo}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT PDF
// ═══════════════════════════════════════════════════════════════════════════
export async function exportToPDF(params: ExportParams) {
  const { movements, summary, dateFrom, dateTo, sectionName, systemName = 'Inventario Jardín' } = params

  // Importaciones dinámicas
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const pageW  = doc.internal.pageSize.getWidth()
  const margin = 18

  // ── Encabezado ────────────────────────────────────────────────────────────
  // Barra de color superior
  doc.setFillColor(13, 27, 42)   // #0D1B2A
  doc.rect(0, 0, pageW, 18, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(systemName, margin, 11.5)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Reporte de Movimientos de Inventario', pageW - margin, 11.5, { align: 'right' })

  // Subencabezado
  doc.setTextColor(65, 90, 119)   // #415A77
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const subtitle = [
    `Período: ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`,
    sectionName ? `  |  Sección: ${sectionName}` : '  |  Todas las secciones',
    `  |  Total: ${movements.length} movimiento${movements.length !== 1 ? 's' : ''}`,
    `  |  Generado: ${fmtDatetime(new Date().toISOString())}`,
  ].join('')
  doc.text(subtitle, margin, 25)

  // Línea separadora
  doc.setDrawColor(220, 225, 231)
  doc.line(margin, 28, pageW - margin, 28)

  // ── Tabla de resumen ──────────────────────────────────────────────────────
  doc.setTextColor(13, 27, 42)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen por tipo', margin, 35)

  const summaryBody = Object.entries(summary).map(([type, s]) => [
    movTypeLabel(type),
    String(s.count),
    String(s.totalQuantity),
    s.totalCost > 0 ? `$${s.totalCost.toLocaleString('es-CL')}` : '—',
  ])

  autoTable(doc, {
    startY: 38,
    head: [['Tipo', 'N° movimientos', 'Unidades totales', 'Costo total']],
    body: summaryBody,
    margin: { left: margin, right: margin },
    tableWidth: 160,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [65, 90, 119], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: { 0: { fontStyle: 'bold' } },
  })

  const afterSummary = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 70

  // ── Tabla de detalle ──────────────────────────────────────────────────────
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(13, 27, 42)
  doc.text('Detalle de movimientos', margin, afterSummary + 10)

  const detailBody = movements.map(m => {
    const item = getItem(m)
    const user = getUser(m)
    const qty  = Math.abs(Number(m.quantityAfter) - Number(m.quantityBefore))
    return [
      item?.name ?? '—',
      item?.section?.name ?? '—',
      movTypeLabel(m.movementType),
      `${qty} ${item?.unit ?? 'u'}`,
      `${m.quantityBefore} → ${m.quantityAfter}`,
      user?.fullName?.split(' ').slice(0, 2).join(' ') ?? '—',
      fmtDate(m.movementDate ?? m.createdAt),
    ]
  })

  // Colorear filas por tipo
  const typeColors: Record<string, [number, number, number]> = {
    Entrada:       [240, 253, 244],
    Salida:        [255, 245, 245],
    Transferencia: [239, 246, 255],
    Ajuste:        [254, 252, 232],
  }

  autoTable(doc, {
    startY: afterSummary + 13,
    head: [['Producto', 'Sección', 'Tipo', 'Cantidad', 'Stock', 'Usuario', 'Fecha']],
    body: detailBody,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8.5, cellPadding: 2.5, overflow: 'ellipsize' },
    headStyles: { fillColor: [13, 27, 42], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 38 },
      2: { cellWidth: 28 },
      3: { cellWidth: 24 },
      4: { cellWidth: 30 },
      5: { cellWidth: 40 },
      6: { cellWidth: 25 },
    },
    willDrawCell: (data) => {
      if (data.section !== 'body') return
      const typeName = String(data.row.cells[2]?.text ?? '')
      const color = typeColors[typeName]
      if (color && data.column.index === 0) {
        // La coloración alternada se aplica por autoTable, solo marcamos la celda de tipo
      }
      if (color) {
        data.cell.styles.fillColor = color
      }
    },
  })

  // ── Footer en cada página ─────────────────────────────────────────────────
  const totalPages = (doc as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 160, 175)
    doc.text(
      `${systemName} — Página ${i} de ${totalPages}`,
      pageW / 2, doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    )
  }

  const filename = `reporte-movimientos_${dateFrom}_${dateTo}.pdf`
  doc.save(filename)
}
