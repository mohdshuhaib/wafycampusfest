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
  const { data: events, error } = await client.from('events').select('id, name, event_code, category, grade_type');
  if (error) {
    console.error(error);
    return;
  }
  const cAndD = events.filter(e => e.grade_type === 'C' || e.grade_type === 'D' || e.category === 'GENERAL' || e.category === 'SPECIAL');
  console.log(`Found ${cAndD.length} General/Special events:`);
  console.log(JSON.stringify(cAndD.slice(0, 15), null, 2));

  // Also check participations for one of these events
  if (cAndD.length > 0) {
    const sampleId = cAndD[0].id;
    const { data: parts } = await client.from('participations').select('id, event_id, student_id, team_id, result_position, performance_grade, points_earned').eq('event_id', sampleId);
    console.log(`Sample event (${cAndD[0].name}) participations:`, parts);
  }

  // Also check all teams
  const { data: teams } = await client.from('teams').select('id, name, color_hex');
  console.log('Teams:', teams);
}

run();
