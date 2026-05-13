import { create } from 'zustand';
import { lsGet, lsSet, LS_KEYS } from '../lib/localStorage';

const useLeadStore = create((set, get) => ({
  leads: lsGet(LS_KEYS.LEADS),

  setLeads: (leads) => { lsSet(LS_KEYS.LEADS, leads); set({ leads }); },

  addLead: (lead) => {
    const leads = [{ ...lead, id: lead.id || crypto.randomUUID(), createdAt: new Date().toISOString() }, ...get().leads];
    lsSet(LS_KEYS.LEADS, leads);
    set({ leads });
  },

  updateLead: (id, updates) => {
    const leads = get().leads.map((l) => (l.id === id ? { ...l, ...updates } : l));
    lsSet(LS_KEYS.LEADS, leads);
    set({ leads });
  },

  deleteLead: (id) => {
    const leads = get().leads.filter((l) => l.id !== id);
    lsSet(LS_KEYS.LEADS, leads);
    set({ leads });
  },

  moveLead: (id, newStatus) => {
    const leads = get().leads.map((l) => (l.id === id ? { ...l, status: newStatus } : l));
    lsSet(LS_KEYS.LEADS, leads);
    set({ leads });
  },

  getByStatus: (status) => get().leads.filter((l) => l.status === status),

  getTotalDealValue: () => get().leads.reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0),

  getClosedValue: () =>
    get().leads.filter((l) => l.status === 'closed').reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0),
}));

export default useLeadStore;
