/** Print-friendly invoice window (Save as PDF from the browser). No extra dependencies. */

export type InvoiceData = {
  businessName: string
  businessEmail?: string | null
  invoiceNumber: string
  issuedAt: string
  customerName: string
  customerEmail?: string | null
  description: string
  amount: number
  status: string
  reference?: string | null
  paidAt?: string | null
}

export function openInvoicePrintWindow(data: InvoiceData) {
  const amount = Number(data.amount).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  })
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #0F1F1A; margin: 0; padding: 32px; }
    .wrap { max-width: 640px; margin: 0 auto; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .muted { color: #4A635A; font-size: 13px; }
    .row { display: flex; justify-content: space-between; gap: 24px; margin-top: 28px; }
    table { width: 100%; border-collapse: collapse; margin-top: 28px; }
    th, td { text-align: left; padding: 10px 0; border-bottom: 1px solid #B9D0C4; font-size: 14px; }
    th { color: #4A635A; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
    .total { font-size: 18px; font-weight: 700; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #E4EFE9; font-size: 12px; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="row">
      <div>
        <h1>${escapeHtml(data.businessName)}</h1>
        ${data.businessEmail ? `<p class="muted">${escapeHtml(data.businessEmail)}</p>` : ''}
      </div>
      <div style="text-align:right">
        <p class="muted">Invoice</p>
        <p><strong>${escapeHtml(data.invoiceNumber)}</strong></p>
        <p class="muted">Issued ${escapeHtml(data.issuedAt)}</p>
        <p><span class="badge">${escapeHtml(data.status)}</span></p>
      </div>
    </div>
    <div class="row">
      <div>
        <p class="muted">Bill to</p>
        <p><strong>${escapeHtml(data.customerName)}</strong></p>
        ${data.customerEmail ? `<p class="muted">${escapeHtml(data.customerEmail)}</p>` : ''}
      </div>
    </div>
    <table>
      <thead>
        <tr><th>Description</th><th style="text-align:right">Amount</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(data.description)}</td>
          <td style="text-align:right">${amount}</td>
        </tr>
      </tbody>
    </table>
    <p class="total" style="text-align:right;margin-top:16px">Total ${amount}</p>
    ${
      data.paidAt
        ? `<p class="muted" style="text-align:right">Paid ${escapeHtml(data.paidAt)}</p>`
        : ''
    }
    ${
      data.reference
        ? `<p class="muted" style="margin-top:24px">Reference: ${escapeHtml(data.reference)}</p>`
        : ''
    }
    <p class="no-print muted" style="margin-top:40px">
      Use your browser’s <strong>Print → Save as PDF</strong> to download this invoice.
    </p>
  </div>
  <script>window.onload = function () { setTimeout(function () { window.print() }, 200) }</script>
</body>
</html>`

  const win = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900')
  if (!win) {
    alert('Pop-up blocked — allow pop-ups to print the invoice.')
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
