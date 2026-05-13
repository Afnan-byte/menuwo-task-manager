import { create } from 'zustand';
import { lsGetObj, lsSet, LS_KEYS } from '../lib/localStorage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const useSettingsStore = create((set, get) => ({
  profile: lsGetObj('menuwo_profile', {
    name: 'Afnan', business: 'Menuwo', email: 'info@menuwo.in', role: 'Founder & CEO'
  }),
  notifications: lsGetObj('menuwo_notif', {
    overdueTasks: true, leadFollowups: true, dailyBriefing: true
  }),
  loading: false,

  fetchSettings: async () => {
    if (!isSupabaseConfigured) return;
    set({ loading: true });
    
    // Fetch profile (use limit 1 instead of single to avoid 406/404 errors on empty tables)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (!profileError && profileData && profileData.length > 0) {
      set({ profile: profileData[0] });
      lsSet('menuwo_profile', profileData[0]);
    }

    // Fetch notifications
    const { data: notifData, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);
    
    if (!notifError && notifData && notifData.length > 0) {
      set({ notifications: notifData[0] });
      lsSet('menuwo_notif', notifData[0]);
    }

    set({ loading: false });
  },

  updateProfile: async (updates) => {
    const newProfile = { ...get().profile, ...updates };
    set({ profile: newProfile });
    lsSet('menuwo_profile', newProfile);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('profiles').upsert([newProfile]);
      if (error) console.error('Supabase error:', error);
    }
  },

  updateNotifications: async (updates) => {
    const newNotifs = { ...get().notifications, ...updates };
    set({ notifications: newNotifs });
    lsSet('menuwo_notif', newNotifs);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('notifications').upsert([newNotifs]);
      if (error) console.error('Supabase error:', error);
    }
  },
}));

export default useSettingsStore;
