import { lsGet, lsSet, LS_KEYS, lsGetObj } from './localStorage';
import { db, isFirebaseConfigured } from './firebase';
import { collection, getDocs, doc, setDoc, limit, query } from 'firebase/firestore';

// Keep an emergency rolling backup in localStorage
export function saveEmergencyBackup() {
  try {
    const backup = {
      timestamp: new Date().toISOString(),
      tasks: lsGet(LS_KEYS.TASKS),
      leads: lsGet(LS_KEYS.LEADS),
      expenses: lsGet(LS_KEYS.EXPENSES),
      notes: lsGet(LS_KEYS.NOTES),
      orders: lsGet(LS_KEYS.ORDERS),
      invoices: lsGet(LS_KEYS.INVOICES),
      content: lsGet(LS_KEYS.CONTENT),
      profile: lsGetObj('menuwo_profile', {}),
      notifications: lsGetObj('menuwo_notif', {}),
    };
    localStorage.setItem('menuwo_safety_backup', JSON.stringify(backup));
    return backup;
  } catch (e) {
    console.error('Failed to create emergency backup:', e);
    return null;
  }
}

// Merge local and remote arrays without losing local data
export function safeMergeItems(localItems = [], remoteItems = []) {
  const localList = Array.isArray(localItems) ? localItems : [];
  const remoteList = Array.isArray(remoteItems) ? remoteItems : [];

  const localMap = new Map(localList.map(item => [item.id, item]));
  const remoteMap = new Map(remoteList.map(item => [item.id, item]));

  const mergedMap = new Map();
  const toUpload = [];

  // Add all remote items
  for (const [id, rItem] of remoteMap) {
    if (localMap.has(id)) {
      const lItem = localMap.get(id);
      const rTime = new Date(rItem.updated_at || rItem.created_at || 0).getTime();
      const lTime = new Date(lItem.updated_at || lItem.created_at || 0).getTime();
      mergedMap.set(id, rTime >= lTime ? rItem : lItem);
    } else {
      mergedMap.set(id, rItem);
    }
  }

  // Keep local items not in remote and mark for upload
  for (const [id, lItem] of localMap) {
    if (!remoteMap.has(id)) {
      mergedMap.set(id, lItem);
      toUpload.push(lItem);
    }
  }

  // Sort newest first
  const merged = Array.from(mergedMap.values()).sort((a, b) => {
    const tA = new Date(a.created_at || 0).getTime();
    const tB = new Date(b.created_at || 0).getTime();
    return tB - tA;
  });

  return { merged, toUpload };
}

// Download a full JSON backup file to the user's computer
export function downloadBackupFile() {
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    tasks: lsGet(LS_KEYS.TASKS),
    leads: lsGet(LS_KEYS.LEADS),
    expenses: lsGet(LS_KEYS.EXPENSES),
    notes: lsGet(LS_KEYS.NOTES),
    orders: lsGet(LS_KEYS.ORDERS),
    invoices: lsGet(LS_KEYS.INVOICES),
    content: lsGet(LS_KEYS.CONTENT),
    profile: lsGetObj('menuwo_profile', {}),
    notifications: lsGetObj('menuwo_notif', {}),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `menuwo-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import JSON backup file
export async function importBackupData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (data.tasks && Array.isArray(data.tasks)) lsSet(LS_KEYS.TASKS, data.tasks);
    if (data.leads && Array.isArray(data.leads)) lsSet(LS_KEYS.LEADS, data.leads);
    if (data.expenses && Array.isArray(data.expenses)) lsSet(LS_KEYS.EXPENSES, data.expenses);
    if (data.notes && Array.isArray(data.notes)) lsSet(LS_KEYS.NOTES, data.notes);
    if (data.orders && Array.isArray(data.orders)) lsSet(LS_KEYS.ORDERS, data.orders);
    if (data.invoices && Array.isArray(data.invoices)) lsSet(LS_KEYS.INVOICES, data.invoices);
    if (data.content && Array.isArray(data.content)) lsSet(LS_KEYS.CONTENT, data.content);
    if (data.profile) lsSet('menuwo_profile', data.profile);
    if (data.notifications) lsSet('menuwo_notif', data.notifications);
    return { success: true };
  } catch (err) {
    console.error('Import backup error:', err);
    return { success: false, error: err.message };
  }
}

// Probe Firestore connection and rules
export async function checkCloudConnection() {
  if (!isFirebaseConfigured || !db) {
    return { status: 'local_only', message: 'Firebase configuration is not set.' };
  }

  try {
    // Attempt a light read query with 5s timeout
    const testPromise = getDocs(query(collection(db, 'tasks'), limit(1)));
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timed out')), 5000)
    );
    
    await Promise.race([testPromise, timeoutPromise]);
    return { status: 'connected', message: 'Cloud database is connected and active.' };
  } catch (err) {
    const msg = err?.message || String(err);
    if (msg.includes('permission') || err?.code === 'permission-denied') {
      return { 
        status: 'permission_denied', 
        message: 'Firebase Firestore security rules are blocking access (permission-denied).' 
      };
    }
    return { status: 'error', message: msg };
  }
}

// Force upload all local data to Firestore
export async function syncAllLocalDataToCloud() {
  if (!isFirebaseConfigured || !db) {
    return { success: false, message: 'Firebase not configured' };
  }

  const results = { tasks: 0, leads: 0, expenses: 0, notes: 0, orders: 0, invoices: 0, content: 0 };

  try {
    // Tasks
    const tasks = lsGet(LS_KEYS.TASKS);
    for (const t of tasks) {
      if (t.id) {
        await setDoc(doc(db, 'tasks', t.id), {
          created_at: t.created_at || new Date().toISOString(),
          title: t.title || '',
          description: t.description || null,
          status: t.status || 'todo',
          priority: t.priority || 'medium',
          deadline: t.deadline || null,
          category: t.category || null,
          deal_value: (t.dealValue !== '' && t.dealValue != null) ? parseFloat(t.dealValue) : 0,
        }, { merge: true });
        results.tasks++;
      }
    }

    // Leads
    const leads = lsGet(LS_KEYS.LEADS);
    for (const l of leads) {
      if (l.id) {
        await setDoc(doc(db, 'leads', l.id), {
          created_at: l.created_at || new Date().toISOString(),
          restaurant: l.restaurant || '',
          contact: l.contact || null,
          phone: l.phone || null,
          location: l.location || null,
          status: l.status || 'lead',
          deal_value: (l.dealValue !== '' && l.dealValue != null) ? parseFloat(l.dealValue) : 0,
          follow_up: l.followUp || null,
          notes: l.notes || null,
        }, { merge: true });
        results.leads++;
      }
    }

    // Expenses
    const expenses = lsGet(LS_KEYS.EXPENSES);
    for (const e of expenses) {
      if (e.id) {
        await setDoc(doc(db, 'expenses', e.id), {
          created_at: e.created_at || new Date().toISOString(),
          type: e.type || 'expense',
          amount: parseFloat(e.amount) || 0,
          category: e.category || null,
          date: e.date || null,
          notes: e.notes || null,
        }, { merge: true });
        results.expenses++;
      }
    }

    // Notes
    const notes = lsGet(LS_KEYS.NOTES);
    for (const n of notes) {
      if (n.id) {
        await setDoc(doc(db, 'notes', n.id), {
          created_at: n.created_at || new Date().toISOString(),
          title: n.title || '',
          content: n.content || null,
          category: n.category || null,
          pinned: !!n.pinned,
          color: n.color || null,
        }, { merge: true });
        results.notes++;
      }
    }

    // Orders
    const orders = lsGet(LS_KEYS.ORDERS);
    for (const o of orders) {
      if (o.id) {
        await setDoc(doc(db, 'orders', o.id), {
          created_at: o.created_at || new Date().toISOString(),
          client: o.client || '',
          stand_type: o.standType || o.stand_type || null,
          qty: parseInt(o.qty) || 1,
          status: o.status || 'pending',
          delivery: o.delivery || null,
          notes: o.notes || null,
        }, { merge: true });
        results.orders++;
      }
    }

    // Invoices
    const invoices = lsGet(LS_KEYS.INVOICES);
    for (const inv of invoices) {
      if (inv.id) {
        await setDoc(doc(db, 'invoices', inv.id), {
          created_at: inv.created_at || new Date().toISOString(),
          invoiceNumber: inv.invoiceNumber || '',
          clientName: inv.clientName || null,
          clientEmail: inv.clientEmail || null,
          clientAddress: inv.clientAddress || null,
          date: inv.date || null,
          dueDate: inv.dueDate || null,
          items: inv.items || [],
          subtotal: inv.subtotal || 0,
          taxRate: inv.taxRate || 0,
          discount: inv.discount || 0,
          total: inv.total || 0,
          status: inv.status || 'draft',
          notes: inv.notes || null,
        }, { merge: true });
        results.invoices++;
      }
    }

    // Content
    const content = lsGet(LS_KEYS.CONTENT);
    for (const c of content) {
      if (c.id) {
        await setDoc(doc(db, 'content', c.id), {
          created_at: c.created_at || new Date().toISOString(),
          title: c.title || '',
          type: c.type || null,
          status: c.status || 'idea',
          date: c.date || null,
          notes: c.notes || null,
        }, { merge: true });
        results.content++;
      }
    }

    // Settings
    const profile = lsGetObj('menuwo_profile', {});
    await setDoc(doc(db, 'profiles', 'profile_001'), profile, { merge: true });

    const notifications = lsGetObj('menuwo_notif', {});
    await setDoc(doc(db, 'notifications', 'notif_001'), {
      overdue_tasks: notifications.overdueTasks ?? true,
      lead_followups: notifications.leadFollowups ?? true,
      daily_briefing: notifications.dailyBriefing ?? true,
    }, { merge: true });

    return { success: true, results };
  } catch (err) {
    console.error('Sync all local data failed:', err);
    return { success: false, error: err.message };
  }
}
