import type { PaperSize } from "./hardwareSettings";

export type ReceiptSale = {
  receiptNumber: string;
  createdAt: string;
  total: string | number;
  subtotal?: string | number;
  discount?: string | number;
  tax?: string | number;
  cashier?: { name: string } | null;
  customer?: { name: string; isWalkIn?: boolean } | null;
  items: { name: string; quantity: number; lineTotal: string | number; discount?: string | number }[];
  payments?: { method: string; amount: string | number; reference?: string | null }[];
};

export type ReceiptOptions = {
  orgName: string;
  orgAddress?: string | null;
  orgPhone?: string | null;
  paperSize?: PaperSize;
  footerMessage?: string;
  logoUrl?: string;
  copies?: number;
};

export function buildReceiptHTML(sale: ReceiptSale, opts: ReceiptOptions): string {
  const { orgName, orgAddress, orgPhone, paperSize = "80mm", footerMessage = "Thank you for your business!", logoUrl = "", copies = 1 } = opts;
  const payment = sale.payments?.[0];
  const amountPaid = Number(payment?.amount ?? sale.total);
  const change = payment?.method === "CASH" ? amountPaid - Number(sale.total) : 0;
  const date = new Date(sale.createdAt);
  const dateStr = date.toLocaleDateString("en-GB");
  const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const width = paperSize === "58mm" ? "58mm" : "80mm";
  const contentW = paperSize === "58mm" ? "130px" : "176px";
  const storeFontSize = paperSize === "58mm" ? "14px" : "18px";
  const eqCount = paperSize === "58mm" ? 28 : 38;

  const itemsHTML = sale.items.map((item) => `
    <div class="item-row"><span># ${item.name} x${item.quantity}</span><span>${Number(item.lineTotal).toFixed(2)}</span></div>
    ${Number(item.discount ?? 0) > 0 ? `<div class="item-row" style="font-size:10px;color:#555"><span>&nbsp;&nbsp;Discount</span><span>-${Number(item.discount).toFixed(2)}</span></div>` : ""}
  `).join("");

  const receiptBody = `
<div class="center">
  ${logoUrl ? `<img src="${logoUrl}" style="max-width:80%;max-height:40px;margin-bottom:4px" />` : ""}
  <div style="letter-spacing:4px;font-size:10px">* * * * *</div>
  <div style="font-size:${storeFontSize};font-weight:700;margin:4px 0 2px">${orgName}</div>
  ${orgAddress ? `<div class="store-sub">${orgAddress}</div>` : ""}
  ${orgPhone ? `<div class="store-sub">${orgPhone}</div>` : ""}
  <div style="letter-spacing:4px;font-size:10px;margin-top:4px">* * * * *</div>
</div>
<div style="margin:8px 0 4px">
  <div class="meta-row"><span class="meta-label">Date:</span><span class="meta-value">${dateStr}</span></div>
  <div class="meta-row"><span class="meta-label">Time:</span><span class="meta-value">${timeStr}</span></div>
  ${sale.cashier?.name ? `<div class="meta-row"><span class="meta-label">Cashier:</span><span class="meta-value">${sale.cashier.name}</span></div>` : ""}
  ${sale.customer?.name && !sale.customer.isWalkIn ? `<div class="meta-row"><span class="meta-label">Customer:</span><span class="meta-value">${sale.customer.name}</span></div>` : ""}
</div>
<div class="eq center">${"=".repeat(eqCount)}</div>
<div class="content">
  ${itemsHTML}
  <div class="dash"></div>
  ${Number(sale.discount ?? 0) > 0 ? `<div class="tax-row"><span>Discount</span><span>-${Number(sale.discount).toFixed(2)}</span></div>` : ""}
  ${Number(sale.tax ?? 0) > 0 ? `<div class="tax-row"><span>VAT/Tax</span><span>${Number(sale.tax).toFixed(2)}</span></div>` : ""}
  <div class="total-row"><span>TOTAL</span><span>${Number(sale.total).toFixed(2)}</span></div>
  <div class="dash"></div>
  <div class="payment-row"><span>${(payment?.method ?? "").replace(/_/g, " ")}:</span><span>${amountPaid.toFixed(2)}</span></div>
  ${change > 0 ? `<div class="payment-row"><span>Change:</span><span>${change.toFixed(2)}</span></div>` : ""}
  ${payment?.reference ? `<div style="margin-top:3px;font-size:10px">#Ref: ${payment.reference}</div>` : ""}
  <div style="margin-top:3px;font-size:10px">#Receipt: ${sale.receiptNumber}</div>
</div>
<div class="thankyou">${footerMessage}</div>
<div class="barcode">
  <svg viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;width:150px;height:36px">
    ${Array.from({ length: 55 }, (_, i) => {
      const x = (4 + i * 3.5).toFixed(1);
      const w = i % 3 === 0 ? 2 : i % 5 === 0 ? 1.5 : 1;
      const h = i % 7 === 0 ? 40 : 32;
      return `<rect x="${x}" y="0" width="${w}" height="${h}" fill="#000"/>`;
    }).join("")}
  </svg>
  <div style="font-size:8px;letter-spacing:2px;margin-top:2px;text-align:center">${sale.receiptNumber}</div>
</div>`;

  // Repeat body for multiple copies
  const allCopies = Array.from({ length: Math.max(1, copies) }, (_, i) =>
    `<div class="receipt">${receiptBody}${i < copies - 1 ? '<div style="border-top:2px dashed #ccc;margin:12px 0"></div>' : ""}</div>`
  ).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Receipt ${sale.receiptNumber}</title>
  <style>
    @page { size: ${width} auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; background: #fff; width: ${width}; margin: 0 auto; }
    .receipt { width: ${width}; padding: 6mm 5mm 10mm; }
    .center { text-align: center; }
    .store-sub { font-size: 10px; color: #444; margin-bottom: 2px; }
    .eq { margin: 6px 0; font-size: 10px; }
    .meta-row { display: flex; margin-bottom: 2px; }
    .meta-label { width: 64px; font-size: 10px; }
    .meta-value { font-size: 10px; }
    .content { width: ${contentW}; margin: 0 auto; }
    .item-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 11px; }
    .dash { border-top: 1px dashed #000; margin: 6px 0; }
    .total-row { display: flex; justify-content: space-between; font-weight: 700; font-size: 13px; margin: 3px 0; }
    .tax-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px; }
    .payment-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px; }
    .thankyou { text-align: center; font-weight: 700; font-size: 12px; margin: 8px 0 5px; letter-spacing: 1px; }
    .barcode { text-align: center; margin-top: 4px; }
  </style>
</head>
<body>${allCopies}</body>
</html>`;
}

export function printReceipt(sale: ReceiptSale, opts: ReceiptOptions): void {
  const html = buildReceiptHTML(sale, opts);
  const win = window.open("", "_blank", "width=420,height=750");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

export function downloadReceiptPDF(sale: ReceiptSale, opts: ReceiptOptions): void {
  const html = buildReceiptHTML(sale, opts);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `receipt-${sale.receiptNumber}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
