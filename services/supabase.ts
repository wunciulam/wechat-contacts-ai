import { createClient } from '@supabase/supabase-js';
import { Contact } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const hasSupabaseConfig = supabaseUrl && supabaseAnonKey && supabaseUrl.includes('supabase.co');

export const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseAnonKey) : null as any;

export const supabaseService = {
  async getContacts(): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async insertContact(contact: Omit<Contact, 'id' | 'created_at'>): Promise<Contact> {
    const { data, error } = await supabase
      .from('contacts')
      .insert(contact)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateContact(id: string, updates: Partial<Contact>): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
  },

  async deleteContact(id: string): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getAllContactsOnce(): Promise<Contact[]> {
    return this.getContacts();
  }
};
