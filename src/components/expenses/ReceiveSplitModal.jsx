import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Split,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

export default function ReceiveSplitModal({
  open,
  entry,
  onClose,
  onConfirm,
  revenueCategories = [],
  expenseCategories = [],
}) {
  if (!open || !entry) return null;

  const totalAmount = parseFloat(entry.amount) || 0;

  // Clean note (strip internal lead link tag for clean display)
  const cleanOriginalNote = (entry.notes || '').replace(/\[LEAD_LINK:[^\]]+\]/g, '').trim();

  // State
  const [revenueAmount, setRevenueAmount] = useState(totalAmount);
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [revenueCategory, setRevenueCategory] = useState(
    revenueCategories.includes(entry.category) ? entry.category : revenueCategories[0] || 'Client Project'
  );
  const [expenseCategory, setExpenseCategory] = useState(expenseCategories[2] || expenseCategories[0] || 'Printing');
  const [revenueNotes, setRevenueNotes] = useState(cleanOriginalNote);
  const [expenseNotes, setExpenseNotes] = useState(
    cleanOriginalNote ? `${cleanOriginalNote} (Production Cost)` : 'Vendor / Production Cost'
  );
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoBalance, setAutoBalance] = useState(true);

  // Re-sync initial values when entry changes
  useEffect(() => {
    if (entry) {
      const amt = parseFloat(entry.amount) || 0;
      const cleanNote = (entry.notes || '').replace(/\[LEAD_LINK:[^\]]+\]/g, '').trim();
      setRevenueAmount(amt);
      setExpenseAmount(0);
      setRevenueNotes(cleanNote);
      setExpenseNotes(cleanNote ? `${cleanNote} (Production Cost)` : 'Vendor / Production Cost');
      setReceiveDate(new Date().toISOString().split('T')[0]);
      setAutoBalance(true);
    }
  }, [entry]);

  const numRev = parseFloat(revenueAmount) || 0;
  const numExp = parseFloat(expenseAmount) || 0;
  const allocatedTotal = numRev + numExp;
  const diff = Math.round((totalAmount - allocatedTotal) * 100) / 100;

  const revPercent = totalAmount > 0 ? Math.min(100, Math.max(0, (numRev / totalAmount) * 100)) : 0;
  const expPercent = totalAmount > 0 ? Math.min(100, Math.max(0, (numExp / totalAmount) * 100)) : 0;

  // Handlers for amounts
  const handleExpenseChange = (val) => {
    setExpenseAmount(val);
    const parsedExp = parseFloat(val) || 0;
    if (autoBalance && totalAmount > 0) {
      const remaining = Math.max(0, Math.round((totalAmount - parsedExp) * 100) / 100);
      setRevenueAmount(remaining);
    }
  };

  const handleRevenueChange = (val) => {
    setRevenueAmount(val);
    const parsedRev = parseFloat(val) || 0;
    if (autoBalance && totalAmount > 0) {
      const remaining = Math.max(0, Math.round((totalAmount - parsedRev) * 100) / 100);
      setExpenseAmount(remaining);
    }
  };

  const applyPreset = (revRatio, expRatio) => {
    const rev = Math.round(totalAmount * revRatio);
    const exp = Math.round(totalAmount * expRatio);
    setRevenueAmount(rev);
    setExpenseAmount(exp);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (allocatedTotal <= 0 && totalAmount > 0) return;

    // Preserve any internal LEAD_LINK tag if present in the original entry note
    const leadLinkMatch = (entry.notes || '').match(/\[LEAD_LINK:[^\]]+\]/);
    const finalRevenueNotes = leadLinkMatch && !revenueNotes.includes(leadLinkMatch[0])
      ? `${revenueNotes} ${leadLinkMatch[0]}`.trim()
      : revenueNotes;

    onConfirm({
      pendingId: entry.id,
      revenueAmount: numRev,
      revenueCategory,
      revenueNotes: finalRevenueNotes,
      expenseAmount: numExp,
      expenseCategory,
      expenseNotes: expenseNotes.trim(),
      date: receiveDate,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 26, stiffness: 360 }}
          className="glass-card w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] rounded-2xl flex flex-col overflow-hidden relative shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{
            boxShadow: '0 0 50px rgba(57,211,0,0.15), 0 20px 60px rgba(0,0,0,0.7)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          {/* Header - Fixed at Top */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/5 flex-shrink-0 bg-[#0f1115]/90 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Split size={16} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2 truncate">
                  Receive & Split Payment
                </h2>
                <p className="text-[11px] text-text-muted truncate">
                  Allocate funds to Revenue and Operational Costs
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0 ml-2"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Body - Scrollable */}
          <form id="receive-split-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 sm:px-5 py-3.5 space-y-3">
            {/* Compact Pending Summary Card */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Clock size={9} />
                    Pending
                  </span>
                  <span className="text-[10px] text-text-muted">{formatDate(entry.date)}</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-white truncate" title={cleanOriginalNote}>
                  {cleanOriginalNote || entry.category || 'Pending Payment'}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-[9px] text-text-muted uppercase tracking-wider block font-medium">Pending Total</span>
                <span className="text-lg sm:text-xl font-black text-amber-400 tracking-tight">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {/* Quick Presets & Auto-balance Strip */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} className="text-accent" />
                  Quick Splits
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer text-text-muted hover:text-text-secondary select-none text-[11px]">
                  <input
                    type="checkbox"
                    checked={autoBalance}
                    onChange={(e) => setAutoBalance(e.target.checked)}
                    className="rounded border-white/20 bg-black/40 text-accent focus:ring-0 w-3 h-3 cursor-pointer"
                  />
                  <span>Auto-balance to {formatCurrency(totalAmount)}</span>
                </label>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '100% Rev', rev: 1.0, exp: 0.0 },
                  { label: '80 / 20', rev: 0.8, exp: 0.2 },
                  { label: '70 / 30', rev: 0.7, exp: 0.3 },
                  { label: '50 / 50', rev: 0.5, exp: 0.5 },
                ].map((preset) => {
                  const isCurrent =
                    Math.abs(numRev - Math.round(totalAmount * preset.rev)) < 2 &&
                    Math.abs(numExp - Math.round(totalAmount * preset.exp)) < 2;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset.rev, preset.exp)}
                      className={`py-1 px-1.5 rounded-lg text-[11px] font-semibold transition-all border text-center truncate ${
                        isCurrent
                          ? 'bg-accent/20 border-accent/40 text-accent shadow-sm'
                          : 'bg-white/[0.03] border-white/5 text-text-secondary hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual Dynamic Split Progress Bar */}
            <div className="space-y-1 bg-black/30 p-2 rounded-xl border border-white/5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <TrendingUp size={11} />
                  Revenue: {formatCurrency(numRev)} ({revPercent.toFixed(0)}%)
                </span>
                <span className="text-red-400 font-semibold flex items-center gap-1">
                  <TrendingDown size={11} />
                  Expense: {formatCurrency(numExp)} ({expPercent.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex border border-white/10">
                <div
                  style={{ width: `${revPercent}%` }}
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-200"
                />
                <div
                  style={{ width: `${expPercent}%` }}
                  className="h-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-200"
                />
              </div>
            </div>

            {/* Side-by-Side Allocation Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Revenue Card */}
              <div className="p-3 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 uppercase tracking-wide">
                    <TrendingUp size={12} />
                    To Revenue
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    +{formatCurrency(numRev)}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-text-muted mb-0.5">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={revenueAmount}
                    onChange={(e) => handleRevenueChange(e.target.value)}
                    className="input-glass font-semibold text-emerald-400 text-xs py-1.5 px-2.5"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-text-muted mb-0.5">Category</label>
                  <select
                    value={revenueCategory}
                    onChange={(e) => setRevenueCategory(e.target.value)}
                    className="input-glass text-xs py-1.5 px-2.5"
                  >
                    {revenueCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-text-muted mb-0.5">Note</label>
                  <input
                    type="text"
                    value={revenueNotes}
                    onChange={(e) => setRevenueNotes(e.target.value)}
                    className="input-glass text-xs py-1.5 px-2.5"
                    placeholder="Revenue description..."
                  />
                </div>
              </div>

              {/* Expense Card */}
              <div className="p-3 rounded-xl bg-red-500/[0.03] border border-red-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-red-400 flex items-center gap-1 uppercase tracking-wide">
                    <TrendingDown size={12} />
                    To Expense
                  </span>
                  <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.2 rounded border border-red-500/20">
                    -{formatCurrency(numExp)}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-text-muted mb-0.5">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={expenseAmount}
                    onChange={(e) => handleExpenseChange(e.target.value)}
                    className="input-glass font-semibold text-red-400 text-xs py-1.5 px-2.5"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-text-muted mb-0.5">Category</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="input-glass text-xs py-1.5 px-2.5"
                  >
                    {expenseCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-text-muted mb-0.5">Note / Cost details</label>
                  <input
                    type="text"
                    value={expenseNotes}
                    onChange={(e) => setExpenseNotes(e.target.value)}
                    className="input-glass text-xs py-1.5 px-2.5"
                    placeholder="Printing / vendor cost..."
                  />
                </div>
              </div>
            </div>

            {/* Date Received Row & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-medium text-text-muted flex items-center gap-1 flex-shrink-0">
                  <Calendar size={11} />
                  Date Cleared:
                </label>
                <input
                  type="date"
                  value={receiveDate}
                  onChange={(e) => setReceiveDate(e.target.value)}
                  className="input-glass text-xs py-1 px-2 w-auto"
                />
              </div>

              {/* Allocation pill */}
              {diff === 0 ? (
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                  <CheckCircle2 size={12} className="flex-shrink-0" />
                  <span>100% Allocated</span>
                </div>
              ) : diff > 0 ? (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                  <AlertCircle size={12} className="flex-shrink-0" />
                  <span>{formatCurrency(diff)} remaining</span>
                  <button
                    type="button"
                    onClick={() => setRevenueAmount((prev) => (parseFloat(prev) || 0) + diff)}
                    className="underline text-[10px] font-bold hover:text-white"
                  >
                    +Rev
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpenseAmount((prev) => (parseFloat(prev) || 0) + diff)}
                    className="underline text-[10px] font-bold hover:text-white"
                  >
                    +Exp
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg">
                  <AlertCircle size={12} className="flex-shrink-0" />
                  <span>+{formatCurrency(Math.abs(diff))} above total</span>
                </div>
              )}
            </div>
          </form>

          {/* Footer - Fixed at Bottom */}
          <div className="flex items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t border-white/5 bg-[#0f1115]/95 backdrop-blur-md flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost py-2 px-3 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="receive-split-form"
              className="btn-accent py-2 px-4 text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-accent/20 hover:shadow-accent/40"
            >
              <CheckCircle2 size={14} />
              <span>
                {numExp > 0
                  ? `Confirm Split (+${formatCurrency(numRev)} / -${formatCurrency(numExp)})`
                  : `Mark Received (+${formatCurrency(numRev)})`}
              </span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
