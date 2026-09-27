export function formatCurrency(amount: number, currency: string = "IDR"): string {
  if (currency === "IDR") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatUsdt(amount: number): string {
  return `${amount.toFixed(2)} USDT`;
}

export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

export function generateTelegramShareMessage(bill: any): string {
  const lines: string[] = [];
  lines.push(`🧾 *ReceiptSplit Bill Breakdown*`);
  lines.push(`📍 *${bill.merchantName}* (${bill.date})`);
  lines.push(`💵 Total: ${formatCurrency(bill.grandTotal, bill.currency)} (~${(bill.grandTotal / bill.exchangeRate).toFixed(2)} USDT)`);
  lines.push(`⛓️ Network: *BNB Chain (Zero-Gas ERC-4337)*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

  bill.participants.forEach((p: any) => {
    const statusIcon = p.isPaid ? "✅ LUNAS" : "⏳ BELUM";
    lines.push(`${statusIcon} *${p.name}*: ${formatCurrency(p.totalFiat, bill.currency)} (*${p.totalUsdt.toFixed(2)} USDT*)`);
    if (p.badge) {
      lines.push(`   └ 🎖️ ${p.badge}`);
    }
  });

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`💳 Host: ${bill.payerName} (${truncateAddress(bill.payerAddress)})`);
  lines.push(`⚡ Pay gas-free with USDT on BNB Chain via ReceiptSplit`);
  return lines.join("\n");
}
