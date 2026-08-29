require('dotenv').config();
const supabase = require('./services/supabaseClient');

async function testConnection() {
  const { data, error } = await supabase.from('agents').select('*');
  if (error) {
    console.error("Connection Failed:", error.message);
  } else {
    console.log("Connection Successful! Data found:", data);
  }
}

testConnection();