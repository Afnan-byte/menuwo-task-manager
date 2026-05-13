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
    
    // Fetch profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .single();
    
    if (!profileError && profileData) {
      set({ profile: profileData });
      lsSet('menuwo_profile', profileData);
    }

    // Fetch notifications
    const { data: notifData, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .single();
    
    if (!notifError && notifData) {
      set({ notifications: notifData });
      lsSet('menuwo_notif', notifData);
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
