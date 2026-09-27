import React, { useState } from "react";
import { Users, Sparkles, X, Plus, Trash2, Check, ArrowRight } from "lucide-react";
import { BillItem } from "../types";
import { formatCurrency } from "../utils/formatters";

interface ItemAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BillItem[];
  currency: string;
  currentParticipants: string[];
  onSaveAssignments: (updatedItems: BillItem[], updatedParticipants: string[]) => void;
}

export const ItemAssignmentModal: React.FC<ItemAssignmentModalProps> = ({
  isOpen,
  onClose,
  items,
  currency,
  currentParticipants,
  onSaveAssignments,
}) => {
  const [itemsState, setItemsState] = useState<BillItem[]>(items);
  const [participantsList, setParticipantsList] = useState<string[]>(currentParticipants);
  const [newPersonName, setNewPersonName] = useState<string>("");
  const [aiChatPrompt, setAiChatPrompt] = useState<string>("");
  const [isAiAssigning, setIsAiAssigning] = useState<boolean>(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddParticipant = () => {
    const trimmed = newPersonName.trim();
    if (trimmed && !participantsList.includes(trimmed)) {
      setParticipantsList([...participantsList, trimmed]);
      setNewPersonName("");
    }
  };

  const handleRemoveParticipant = (name: string) => {
    if (participantsList.length <= 1) {
      alert("Minimal harus ada 1 peserta.");
      return;
    }
    const filtered = participantsList.filter((p) => p !== name);
    setParticipantsList(filtered);
    // remove from items
    setItemsState(
      itemsState.map((it) => ({
        ...it,
        assignedTo: it.assignedTo.filter((p) => p !== name),
      }))
    );
  };

  const toggleItemParticipant = (itemId: string, person: string) => {
    setItemsState(
      itemsState.map((it) => {
        if (it.id !== itemId) return it;
        const exists = it.assignedTo.includes(person);
        const newAssigned = exists
          ? it.assignedTo.filter((p) => p !== person)
          : [...it.assignedTo, person];
        return {
          ...it,
          assignedTo: newAssigned,
        };
      })
    );
  };

  const handleAiAutoAssign = async () => {
    if (!aiChatPrompt.trim()) return;
    setIsAiAssigning(true);
    setAiReasoning(null);
    try {
      const res = await fetch("/api/receipts/ai-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsState,
          chatText: aiChatPrompt,
          currentParticipants: participantsList,
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        const { participants: newParts, assignments, reasoning } = data.result;
        if (newParts && newParts.length > 0) {
          // Merge unique participants
          const combined = Array.from(new Set([...participantsList, ...newParts]));
          setParticipantsList(combined);
        }
        if (assignments && Array.isArray(assignments)) {
          const map = new Map<string, string[]>();
          assignments.forEach((a: any) => {
            if (a.itemId && a.assignedTo) {
              map.set(a.itemId, a.assignedTo);
            }
          });
          setItemsState((prev) =>
            prev.map((it) => {
              if (map.has(it.id)) {
                return { ...it, assignedTo: map.get(it.id)! };
              }
              return it;
            })
          );
        }
        setAiReasoning(reasoning || "Item berhasil dipetakan otomatis sesuai chat grup!");
      }
    } catch (e) {
      console.error("AI assign error:", e);
    } finally {
      setIsAiAssigning(false);
    }
  };

  const handleSave = () => {
    onSaveAssignments(itemsState, participantsList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-950/70">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Atur Siapa Makan Apa</h3>
              <p className="text-xs text-slate-400">Centang nama atau biarkan AI auto-assign dari pesan chat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scroll Content */}
        <div className="overflow-y-auto p-5 space-y-5">
          {/* Participants chips editor */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Daftar Teman Nongkrong ({participantsList.length} Orang)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {participantsList.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-amber-300 border border-slate-700"
                >
                  <span>{p}</span>
                  <button
                    onClick={() => handleRemoveParticipant(p)}
                    className="hover:text-red-400 ml-1"
                    title={`Hapus ${p}`}
                  >
                    ×
                  </button>
                </span>
              ))}

              {/* Add friend input */}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddParticipant()}
                  placeholder="+ Tambah teman"
                  className="rounded-full bg-slate-950 px-3 py-1 text-xs text-slate-200 border border-slate-800 focus:border-amber-500 focus:outline-none w-28"
                />
                <button
                  onClick={handleAddParticipant}
                  className="rounded-full bg-slate-800 p-1 text-slate-300 hover:bg-amber-500 hover:text-slate-950 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* AI Quick Prompt Auto Assigner */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                AI Quick Auto-Assign (Chat Grup Parser)
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiChatPrompt}
                onChange={(e) => setAiChatPrompt(e.target.value)}
                placeholder="Contoh: Budi makan Kopi Mantan + Toast, Siti Matcha, Dimsum berdua..."
                className="flex-1 rounded-lg bg-slate-950 px-3 py-1.5 text-xs text-slate-200 border border-slate-700 focus:border-amber-500 focus:outline-none"
              />
              <button
                onClick={handleAiAutoAssign}
                disabled={isAiAssigning || !aiChatPrompt.trim()}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition"
              >
                {isAiAssigning ? "Memproses..." : "Terapkan"}
              </button>
            </div>
            {aiReasoning && (
              <p className="text-[11px] text-emerald-300 italic">🤖 {aiReasoning}</p>
            )}
          </div>

          {/* Items matrix */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Pilih Siapa yang Mengonsumsi Menu
            </span>
            <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950">
              {itemsState.map((item) => (
                <div key={item.id} className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200">{item.name}</span>
                      <span className="text-[11px] text-slate-400 ml-2">
                        {formatCurrency(item.totalPrice, currency)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Porsi: {item.assignedTo.length || "0"} orang (
                      {item.assignedTo.length > 0
                        ? formatCurrency(item.totalPrice / item.assignedTo.length, currency) + "/orang"
                        : "Belum dipilih"}
                      )
                    </span>
                  </div>

                  {/* Checkbox chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {participantsList.map((person) => {
                      const isSelected = item.assignedTo.includes(person);
                      return (
                        <button
                          key={person}
                          type="button"
                          onClick={() => toggleItemParticipant(item.id, person)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition flex items-center gap-1 ${
                            isSelected
                              ? "bg-amber-500 text-slate-950 font-semibold"
                              : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          <span>{person}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 bg-slate-950/80 px-5 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
          >
            Batal
          </button>

          <button
            id="btn-save-assignments"
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-400 active:scale-95 transition"
          >
            <span>Simpan & Hitung Ulang Proporsional</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
