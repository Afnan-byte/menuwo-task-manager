import { create } from 'zustand';
import { lsGetObj, lsSet } from '../lib/localStorage';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { 
  doc, 
  getDoc,
  setDoc,
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
    if (!isFirebaseConfigured || !db) return;
    set({ loading: true });
    
    try {
      // Fetch profile
      const profileDoc = await getDoc(doc(db, 'profiles', PROFILE_ID));
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        set({ profile: data });
        lsSet('menuwo_profile', data);
      } else {
        // Cloud has no profile yet - upload existing local profile
        const localProfile = get().profile;
        if (localProfile) {
          await setDoc(doc(db, 'profiles', PROFILE_ID), localProfile, { merge: true });
        }
      }

      // Fetch notifications
      const notifDoc = await getDoc(doc(db, 'notifications', NOTIF_ID));
      if (notifDoc.exists()) {
        const data = notifDoc.data();
        const mappedNotifs = {
          ...data,
          overdueTasks: data.overdue_tasks ?? true,
          leadFollowups: data.lead_followups ?? true,
          dailyBriefing: data.daily_briefing ?? true,
        };
        set({ notifications: mappedNotifs });
        lsSet('menuwo_notif', mappedNotifs);
      } else {
        // Cloud has no notifications yet - upload local
        const localNotifs = get().notifications;
        if (localNotifs) {
          await setDoc(doc(db, 'notifications', NOTIF_ID), {
            overdue_tasks: localNotifs.overdueTasks ?? true,
            lead_followups: localNotifs.leadFollowups ?? true,
            daily_briefing: localNotifs.dailyBriefing ?? true,
          }, { merge: true });
        }
      }
    } catch (e) {
      console.warn('Firebase settings fetch warning:', e.message);
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (updates) => {
    const newProfile = { ...get().profile, ...updates };
    set({ profile: newProfile });
    lsSet('menuwo_profile', newProfile);

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'profiles', PROFILE_ID), newProfile, { merge: true });
      } catch (e) {
        console.warn('Firebase profile update warning:', e.message);
      }
    }
  },

  updateNotifications: async (updates) => {
    const newNotifs = { ...get().notifications, ...updates };
    set({ notifications: newNotifs });
    lsSet('menuwo_notif', newNotifs);

    if (isFirebaseConfigured && db) {
      const dbNotifs = {
        overdue_tasks: newNotifs.overdueTasks,
        lead_followups: newNotifs.leadFollowups,
        daily_briefing: newNotifs.dailyBriefing,
      };

      try {
        await setDoc(doc(db, 'notifications', NOTIF_ID), dbNotifs, { merge: true });
      } catch (e) {
        console.warn('Firebase notif update warning:', e.message);
      }
    }
  },
}));

export default useSettingsStore;
