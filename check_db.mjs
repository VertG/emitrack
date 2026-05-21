import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function check() {
  const { data: p } = await supabase.from('profiles').select('*').limit(1)
  const { data: t } = await supabase.from('trips').select('*').limit(1)
  console.log('--- profiles ---')
  console.log(p && p.length > 0 ? Object.keys(p[0]) : 'No data')
  console.log('--- trips ---')
  console.log(t && t.length > 0 ? Object.keys(t[0]) : 'No data')
}
check()
