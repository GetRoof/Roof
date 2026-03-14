require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function check() {
  const sources = ['Pararius', 'Kamernet', 'Huurwoningen']
  for (const source of sources) {
    const { data } = await sb.from('listings').select('title, image_url, external_id').eq('source', source).eq('is_active', true)
    const noImg = data.filter(r => !r.image_url || r.image_url === '')
    const hosted = data.filter(r => r.image_url && r.image_url.includes('supabase'))
    const external = data.filter(r => r.image_url && !r.image_url.includes('supabase') && r.image_url !== '')
    console.log(`\n${source}: ${data.length} total | ${hosted.length} hosted | ${external.length} external | ${noImg.length} no image`)
    noImg.slice(0, 3).forEach(r => console.log(`  Missing: ${r.title}`))
  }
}
check()
