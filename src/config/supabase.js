import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ваши данные из Supabase
const supabaseUrl = 'https://nvzyzfzzxcjqejqzwzuf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52enl6Znp6eGNqcWVqcXp3enVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MTI1ODYsImV4cCI6MjA2NDk4ODU4Nn0.3F_ZHYhhkGJ2gd1KByHzjRVL_z6OYsESX-4avxaaJGw';

// Создание клиента Supabase с настройками для React Native
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'react-native',
    },
  },
});