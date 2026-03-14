/**
 * Re-upload images for listings that still have external URLs
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const { createClient } = require('@supabase/supabase-js')
const uploadImage = require('./lib/upload-image')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function main() {
  const { data: listings } = await supabase
    .from('listings')
    .select('external_id, source, image_url')
    .eq('is_active', true)
    .not('image_url', 'is', null)

  const external = listings.filter(l => l.image_url && !l.image_url.includes('supabase'))
  console.log(`Found ${external.length} listings with external image URLs`)

  let fixed = 0
  for (const l of external) {
    const referer = l.source === 'Kamernet' ? 'https://kamernet.nl/'
      : l.source === 'Pararius' ? 'https://www.pararius.com/'
      : l.source === 'Huurwoningen' ? 'https://www.huurwoningen.com/'
      : 'https://www.google.com/'
    
    const hostedUrl = await uploadImage(supabase, l.external_id, l.image_url, referer)
    if (hostedUrl) {
      await supabase.from('listings').update({ image_url: hostedUrl }).eq('external_id', l.external_id)
      fixed++
      process.stdout.write('.')
    }
  }
  console.log(`\n✅ Fixed ${fixed}/${external.length} images`)
}

main().catch(e => console.error(e.message))
