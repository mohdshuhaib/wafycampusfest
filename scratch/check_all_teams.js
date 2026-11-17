const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
let envUrl = '', envKey = '';
env.split('\n').forEach(l => {
  if (l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) envUrl = l.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
  if (l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) envKey = l.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
  if (!envKey && l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) envKey = l.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
});

const client = createClient(envUrl, envKey);

async function run() {
  const { data: teams, error } = await client.from('teams').select('*');
  console.log('All teams in database:', JSON.stringify(teams, null, 2));

  // Check how many students exist per team
  const { data: students } = await client.from('students').select('team_id');
  const countByTeam = {};
  (students || []).forEach(s => {
    countByTeam[s.team_id] = (countByTeam[s.team_id] || 0) + 1;
  });
  console.log('Students count per team:', countByTeam);
}

run();
