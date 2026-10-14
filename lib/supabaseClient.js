import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oybqxhzsghdwxyhuixwd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95YnF4aHpzZ2hkd3h5aHVpeHdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NTgyODAsImV4cCI6MjEwNzUzNDI4MH0.DWP2GRA9nR_H90JDN42NFM8Mwf-tpRlgdIIly1mRctY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)