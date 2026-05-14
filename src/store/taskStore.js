import { create } from 'zustand';
import { lsGet, lsSet, LS_KEYS } from '../lib/localStorage';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
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
    if (!isFirebaseConfigured) return;
    set({ loading: true });
    try {
      const q = query(collection(db, 'tasks'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        dealValue: doc.data().deal_value || 0,
      }));
      set({ tasks: data });
      lsSet(LS_KEYS.TASKS, data);
    } catch (e) {
      console.error('Firebase fetch error:', e);
    }
    set({ loading: false });
  },

  subscribeToChanges: () => {
    if (!isFirebaseConfigured) return;
    const q = query(collection(db, 'tasks'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        dealValue: doc.data().deal_value || 0,
      }));
      set({ tasks: data });
      lsSet(LS_KEYS.TASKS, data);
    });
    return unsubscribe;
  },

  addTask: async (task) => {
    const newTask = {
      ...task,
      created_at: new Date().toISOString()
    };
    
    // Optimistic update for local
    const optimisticId = crypto.randomUUID();
    const updatedTasks = [{ ...newTask, id: optimisticId }, ...get().tasks];
    set({ tasks: updatedTasks });
    lsSet(LS_KEYS.TASKS, updatedTasks);

    if (isFirebaseConfigured) {
      const dbTask = {
        created_at: newTask.created_at,
        title: newTask.title,
        description: newTask.description || null,
        status: newTask.status || 'todo',
        priority: newTask.priority || 'medium',
        deadline: (newTask.deadline !== '' && newTask.deadline != null) ? newTask.deadline : null,
        category: newTask.category || null,
        deal_value: (newTask.dealValue !== '' && newTask.dealValue != null) ? parseFloat(newTask.dealValue) : 0,
      };
      try {
        await addDoc(collection(db, 'tasks'), dbTask);
      } catch (e) {
        console.error('Firebase add error:', e);
      }
    }
  },

  updateTask: async (id, updates) => {
    const updatedTasks = get().tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
    set({ tasks: updatedTasks });
    lsSet(LS_KEYS.TASKS, updatedTasks);

    if (isFirebaseConfigured) {
      const dbUpdates = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description || null;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.deadline !== undefined) dbUpdates.deadline = (updates.deadline !== '' && updates.deadline != null) ? updates.deadline : null;
      if (updates.category !== undefined) dbUpdates.category = updates.category || null;
      if (updates.dealValue !== undefined) dbUpdates.deal_value = (updates.dealValue !== '' && updates.dealValue != null) ? parseFloat(updates.dealValue) : 0;
      
      try {
        const taskRef = doc(db, 'tasks', id);
        await updateDoc(taskRef, dbUpdates);
      } catch (e) {
        console.error('Firebase update error:', e);
      }
    }
  },

  deleteTask: async (id) => {
    const updatedTasks = get().tasks.filter((t) => t.id !== id);
    set({ tasks: updatedTasks });
    lsSet(LS_KEYS.TASKS, updatedTasks);

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'tasks', id));
      } catch (e) {
        console.error('Firebase delete error:', e);
      }
    }
  },

  moveTask: async (id, newStatus) => {
    const updatedTasks = get().tasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t));
    set({ tasks: updatedTasks });
    lsSet(LS_KEYS.TASKS, updatedTasks);

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'tasks', id), { status: newStatus });
      } catch (e) {
        console.error('Firebase move error:', e);
      }
    }
  },
}));

export default useTaskStore;
