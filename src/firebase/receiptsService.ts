import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./config";
import { Bill, BillItem, BillParticipant } from "../types";

export interface FirestoreReceiptDoc {
  id: string;
  ownerId: string;
  title: string;
  merchantName: string;
  date?: string;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  tax?: number;
  serviceCharge?: number;
  discount?: number;
  grandTotal: number;
  payerName?: string;
  payerAddress: string;
  network?: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
    assignedTo: string[];
  }>;
  participants: Array<{
    id: string;
    name: string;
    itemsShare: number;
    taxAndServiceShare: number;
    totalFiat: number;
    totalUsdt: number;
    isPaid: boolean;
    paidAt?: string;
    txHash?: string;
    badge?: string;
    address?: string;
  }>;
  createdAt: any;
  updatedAt: any;
}

// Convert Firestore doc data to client Bill model
export function formatFirestoreReceipt(data: any): Bill {
  let createdAtStr = new Date().toISOString();
  if (data.createdAt instanceof Timestamp) {
    createdAtStr = data.createdAt.toDate().toISOString();
  } else if (typeof data.createdAt === "string") {
    createdAtStr = data.createdAt;
  }

  return {
    id: data.id,
    title: data.title || "Struk Tanpa Nama",
    merchantName: data.merchantName || "Restoran",
    date: data.date || new Date().toISOString().split("T")[0],
    currency: data.currency || "IDR",
    exchangeRate: Number(data.exchangeRate) || 16300,
    subtotal: Number(data.subtotal) || 0,
    tax: Number(data.tax) || 0,
    serviceCharge: Number(data.serviceCharge) || 0,
    discount: Number(data.discount) || 0,
    grandTotal: Number(data.grandTotal) || 0,
    payerName: data.payerName || "Host",
    payerAddress: data.payerAddress || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    network: (data.network as any) || "BNB Chain (BSC)",
    items: Array.isArray(data.items) ? data.items : [],
    participants: Array.isArray(data.participants) ? data.participants : [],
    createdAt: createdAtStr,
  };
}

/**
 * Sanitize and prepare document payload matching Firestore schema and rules
 */
function prepareReceiptPayload(bill: Bill, ownerId: string, isCreate: boolean): any {
  // Safe ID sanitization
  const safeId = (bill.id || `bill-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);

  const cleanItems = (bill.items || []).slice(0, 50).map((it, idx) => ({
    id: String(it.id || `it-${idx + 1}`).slice(0, 64),
    name: String(it.name || "Item").slice(0, 100),
    quantity: Math.max(1, Math.min(999, Number(it.quantity) || 1)),
    pricePerUnit: Math.max(0, Number(it.pricePerUnit) || 0),
    totalPrice: Math.max(0, Number(it.totalPrice) || 0),
    assignedTo: Array.isArray(it.assignedTo) ? it.assignedTo.map((n) => String(n).slice(0, 50)) : [],
  }));

  const cleanParticipants = (bill.participants || []).slice(0, 30).map((p, idx) => {
    const item: Record<string, any> = {
      id: String(p.id || `p-${idx + 1}`).slice(0, 64),
      name: String(p.name || `Teman ${idx + 1}`).slice(0, 50),
      itemsShare: Math.max(0, Math.round(Number(p.itemsShare) || 0)),
      taxAndServiceShare: Math.max(0, Math.round(Number(p.taxAndServiceShare) || 0)),
      totalFiat: Math.max(0, Math.round(Number(p.totalFiat) || 0)),
      totalUsdt: Math.max(0, Number(Number(p.totalUsdt || 0).toFixed(2))),
      isPaid: Boolean(p.isPaid),
    };
    if (p.paidAt) item.paidAt = String(p.paidAt).slice(0, 50);
    if (p.txHash) item.txHash = String(p.txHash).slice(0, 70);
    if (p.badge) item.badge = String(p.badge).slice(0, 50);
    if (p.address) item.address = String(p.address).slice(0, 66);
    return item;
  });

  const payload: Record<string, any> = {
    id: safeId,
    ownerId,
    title: (bill.title || "Struk Nongkrong").slice(0, 120),
    merchantName: (bill.merchantName || "Kafe / Restoran").slice(0, 120),
    currency: (bill.currency || "IDR").slice(0, 10),
    exchangeRate: Number(bill.exchangeRate) || 16300,
    subtotal: Math.max(0, Number(bill.subtotal) || 0),
    grandTotal: Math.max(0, Number(bill.grandTotal) || 0),
    payerAddress: (bill.payerAddress || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e").slice(0, 66),
    items: cleanItems,
    participants: cleanParticipants,
    updatedAt: serverTimestamp(),
  };

  if (bill.date) payload.date = String(bill.date).slice(0, 30);
  if (bill.tax !== undefined) payload.tax = Math.max(0, Number(bill.tax) || 0);
  if (bill.serviceCharge !== undefined) payload.serviceCharge = Math.max(0, Number(bill.serviceCharge) || 0);
  if (bill.discount !== undefined) payload.discount = Math.max(0, Number(bill.discount) || 0);
  if (bill.payerName) payload.payerName = String(bill.payerName).slice(0, 100);
  if (bill.network) payload.network = String(bill.network).slice(0, 50);

  if (isCreate) {
    payload.createdAt = serverTimestamp();
  }

  return { safeId, payload };
}

/**
 * Save a receipt to Firestore (creates new or updates existing)
 */
export async function saveReceiptToFirestore(bill: Bill, userId: string): Promise<string> {
  const collectionPath = "receipts";
  let targetId = bill.id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
  const docRef = doc(db, collectionPath, targetId);

  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      // Update
      const { payload } = prepareReceiptPayload(bill, userId, false);
      delete payload.id;
      delete payload.ownerId; // Immutable in rules
      await updateDoc(docRef, payload);
      return targetId;
    } else {
      // Create
      const { safeId, payload } = prepareReceiptPayload(bill, userId, true);
      await setDoc(doc(db, collectionPath, safeId), payload);
      return safeId;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionPath}/${targetId}`);
  }
}

/**
 * Update participants settlement state in Firestore
 */
export async function updateReceiptSettlementInFirestore(
  receiptId: string,
  updatedParticipants: BillParticipant[]
): Promise<void> {
  const targetId = receiptId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
  const docPath = `receipts/${targetId}`;

  const cleanParticipants = updatedParticipants.slice(0, 30).map((p, idx) => {
    const item: Record<string, any> = {
      id: String(p.id || `p-${idx + 1}`).slice(0, 64),
      name: String(p.name || `Teman ${idx + 1}`).slice(0, 50),
      itemsShare: Math.max(0, Math.round(Number(p.itemsShare) || 0)),
      taxAndServiceShare: Math.max(0, Math.round(Number(p.taxAndServiceShare) || 0)),
      totalFiat: Math.max(0, Math.round(Number(p.totalFiat) || 0)),
      totalUsdt: Math.max(0, Number(Number(p.totalUsdt || 0).toFixed(2))),
      isPaid: Boolean(p.isPaid),
    };
    if (p.paidAt) item.paidAt = String(p.paidAt).slice(0, 50);
    if (p.txHash) item.txHash = String(p.txHash).slice(0, 70);
    if (p.badge) item.badge = String(p.badge).slice(0, 50);
    if (p.address) item.address = String(p.address).slice(0, 66);
    return item;
  });

  try {
    const docRef = doc(db, "receipts", targetId);
    await updateDoc(docRef, {
      participants: cleanParticipants,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

/**
 * Delete receipt from Firestore
 */
export async function deleteReceiptFromFirestore(receiptId: string): Promise<void> {
  const targetId = receiptId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
  const docPath = `receipts/${targetId}`;

  try {
    await deleteDoc(doc(db, "receipts", targetId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Real-time listener for the current user's receipts list
 */
export function subscribeUserReceipts(
  userId: string,
  onData: (receipts: Bill[]) => void,
  onError?: (err: any) => void
) {
  const collectionPath = "receipts";
  const q = query(
    collection(db, collectionPath),
    where("ownerId", "==", userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const bills: Bill[] = [];
      snapshot.forEach((d) => {
        bills.push(formatFirestoreReceipt(d.data()));
      });
      // Sort client-side by creation date descending
      bills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(bills);
    },
    (error) => {
      console.error("Firestore receipts query error:", error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, collectionPath);
    }
  );
}
