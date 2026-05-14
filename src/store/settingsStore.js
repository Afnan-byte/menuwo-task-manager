import { create } from 'zustand';
import { lsGetObj, lsSet } from '../lib/localStorage';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { 
  doc, 
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';

const PROFILE_ID = 'profile_001';
const NOTIF_ID = 'notif_001';

const useSettingsStore = create((set, get) => ({
  profile: lsGetObj('menuwo_profile', {
    name: 'Afnan', business: 'Menuwo', email: 'info@menuwo.in', role: 'Founder & CEO'
  }),
  notifications: lsGetObj('menuwo_notif', {
    overdueTasks: true, leadFollowups: true, dailyBriefing: true
  }),
  loading: false,

  fetchSettings: async () => {
    if (!isFirebaseConfigured) return;
    set({ loading: true });
    
    try {
      // Fetch profile
      const profileDoc = await getDoc(doc(db, 'profiles', PROFILE_ID));
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        set({ profile: data });
        lsSet('menuwo_profile', data);
      }

      // Fetch notifications
      const notifDoc = await getDoc(doc(db, 'notifications', NOTIF_ID));
      if (notifDoc.exists()) {
        const data = notifDoc.data();
        const mappedNotifs = {
          ...data,
          overdueTasks: data.overdue_tasks,
          leadFollowups: data.lead_followups,
          dailyBriefing: data.daily_briefing,
        };
        set({ notifications: mappedNotifs });
        lsSet('menuwo_notif', mappedNotifs);
      }
    } catch (e) {
      console.error('Firebase settings fetch error:', e);
    }

    set({ loading: false });
  },

  updateProfile: async (updates) => {
    const newProfile = { ...get().profile, ...updates };
    set({ profile: newProfile });
    lsSet('menuwo_profile', newProfile);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'profiles', PROFILE_ID), newProfile, { merge: true });
      } catch (e) {
        console.error('Firebase profile update error:', e);
      }
    }
  },

  updateNotifications: async (updates) => {
    const newNotifs = { ...get().notifications, ...updates };
    set({ notifications: newNotifs });
    lsSet('menuwo_notif', newNotifs);

    if (isFirebaseConfigured) {
      // Map camelCase to snake_case for consistency with DB schema if desired, 
      // though Firestore is flexible with camelCase.
      const dbNotifs = {
        overdue_tasks: newNotifs.overdueTasks,
        lead_followups: newNotifs.leadFollowups,
        daily_briefing: newNotifs.dailyBriefing,
      };

      try {
        await setDoc(doc(db, 'notifications', NOTIF_ID), dbNotifs, { merge: true });
      } catch (e) {
        console.error('Firebase notif update error:', e);
      }
    }
  },
}));

export default useSettingsStore;
