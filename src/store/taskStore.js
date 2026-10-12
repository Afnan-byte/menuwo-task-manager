import { create } from 'zustand';
import { lsGet, lsSet, LS_KEYS } from '../lib/localStorage';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { safeMergeItems } from '../lib/syncService';
import { 
  collection, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs
} from 'firebase/firestore';

const useTaskStore = create((set, get) => ({
  tasks: lsGet(LS_KEYS.TASKS),
  loading: false,

  fetchTasks: async () => {
    if (!isFirebaseConfigured || !db) return;
    set({ loading: true });
    try {
      const q = query(collection(db, 'tasks'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const remoteData = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        dealValue: doc.data().deal_value || 0,
      }));

      // Safe merge to prevent deleting existing local data
      const localTasks = get().tasks || lsGet(LS_KEYS.TASKS);
      const { merged, toUpload } = safeMergeItems(localTasks, remoteData);
      set({ tasks: merged });
      lsSet(LS_KEYS.TASKS, merged);

      // Upload unsynced local tasks to cloud
      if (toUpload.length > 0) {
        for (const t of toUpload) {
          try {
            await setDoc(doc(db, 'tasks', t.id), {
              created_at: t.created_at || new Date().toISOString(),
              title: t.title || '',
              description: t.description || null,
              status: t.status || 'todo',
              priority: t.priority || 'medium',
              deadline: (t.deadline !== '' && t.deadline != null) ? t.deadline : null,
              category: t.category || null,
              deal_value: (t.dealValue !== '' && t.dealValue != null) ? parseFloat(t.dealValue) : 0,
            }, { merge: true });
          } catch (uploadErr) {
            console.warn('[Tasks] Cloud upload item failed:', uploadErr);
          }
        }
      }
    } catch (e) {
      console.warn('Firebase fetch tasks warning:', e.message);
    } finally {
      set({ loading: false });
    }
  },

  subscribeToChanges: () => {
    if (!isFirebaseConfigured || !db) return;
    const q = query(collection(db, 'tasks'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const remoteData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        dealValue: doc.data().deal_value || 0,
      }));
      const localTasks = get().tasks || [];
      const { merged } = safeMergeItems(localTasks, remoteData);
      set({ tasks: merged });
      lsSet(LS_KEYS.TASKS, merged);
    }, (err) => {
      console.warn('Firebase tasks subscription warning:', err.message);
    });
    return unsubscribe;
  },

  addTask: async (task) => {
    const taskId = task.id || crypto.randomUUID();
    const newTask = {
      ...task,
      id: taskId,
      created_at: task.created_at || new Date().toISOString()
    };
    
    // Optimistic update for local
    const updatedTasks = [newTask, ...get().tasks.filter(t => t.id !== taskId)];
    set({ tasks: updatedTasks });
    lsSet(LS_KEYS.TASKS, updatedTasks);

    if (isFirebaseConfigured && db) {
      const dbTask = {
        created_at: newTask.created_at,
        title: newTask.title || '',
        description: newTask.description || null,
        status: newTask.status || 'todo',
        priority: newTask.priority || 'medium',
        deadline: (newTask.deadline !== '' && newTask.deadline != null) ? newTask.deadline : null,
        category: newTask.category || null,
        deal_value: (newTask.dealValue !== '' && newTask.dealValue != null) ? parseFloat(newTask.dealValue) : 0,
      };
      try {
        await setDoc(doc(db, 'tasks', taskId), dbTask, { merge: true });
      } catch (e) {
        console.warn('Firebase add task warning:', e.message);
      }
    }
  },

  updateTask: async (id, updates) => {
    const updatedTasks = get().tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
    set({ tasks: updatedTasks });
    lsSet(LS_KEYS.TASKS, updatedTasks);

    if (isFirebaseConfigured && db) {
      const dbUpdates = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description || null;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.deadline !== undefined) dbUpdates.deadline = (updates.deadline !== '' && updates.deadline != null) ? updates.deadline : null;
      if (updates.category !== undefined) dbUpdates.category = updates.category || null;
      if (updates.dealValue !== undefined) dbUpdates.deal_value = (updates.dealValue !== '' && updates.dealValue != null) ? parseFloat(updates.dealValue) : 0;
      
      try {
        await updateDoc(doc(db, 'tasks', id), dbUpdates);
      } catch (e) {
        console.warn('Firebase update task warning:', e.message);
      }
    }
  },

  deleteTask: async (id) => {
    const updatedTasks = get().tasks.filter((t) => t.id !== id);
    set({ tasks: updatedTasks });
    lsSet(LS_KEYS.TASKS, updatedTasks);

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'tasks', id));
      } catch (e) {
        console.warn('Firebase delete task warning:', e.message);
      }
    }
  },

  moveTask: async (id, newStatus) => {
    const updatedTasks = get().tasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t));
    set({ tasks: updatedTasks });
    lsSet(LS_KEYS.TASKS, updatedTasks);

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'tasks', id), { status: newStatus });
      } catch (e) {
        console.warn('Firebase move task warning:', e.message);
      }
    }
  },
}));

export default useTaskStore;
