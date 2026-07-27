import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.pnmyapthqsmwbzevjixb.supabase.co || '';
const supabaseAnonKey = import.meta.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBubXlhcHRocXNtd2J6ZXZqaXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNjY3ODIsImV4cCI6MjEwMDY0Mjc4Mn0.MUw3pBgvGQnElU7BbX__ZMKdmljr-nPm3Z4H-BOnjac || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
