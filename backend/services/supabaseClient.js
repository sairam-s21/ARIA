const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://jvngneprhzcgbwgtyaye.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bmduZXByaHpjZ2J3Z3R5YXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4ODc2MDksImV4cCI6MjEwMzQ2MzYwOX0.SiMtaF5Ze4Tew_bvlHfpSxoR1o_GqaYib4lGKNAxaEc';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;