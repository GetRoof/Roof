/**
 * Shared image upload helper — downloads an image from an external URL
 * and re-hosts it in Supabase Storage to avoid hotlink blocking.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} externalId  Stable hash ID for the listing
 * @param {string} sourceUrl   External image URL to download
 * @param {string} refererUrl  Referer header (e.g. 'https://www.pararius.com/')
 * @returns {Promise<string|null>} Supabase public URL, or null on failure
 */
async function uploadImage(supabase, externalId, sourceUrl, refererUrl) {
  if (!supabase || !sourceUrl) return null
  try {
    const res = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': refererUrl,
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    })
    if (!res.ok) {
      console.error(`  ⚠️ Image download failed (${res.status}): ${sourceUrl.slice(0, 80)}`)
      return null
    }
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg'
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 500) {
      console.error(`  ⚠️ Image too small (${buffer.length}b): ${sourceUrl.slice(0, 80)}`)
      return null
    }
    const path = `listings/${externalId}.${ext}`
    const { error } = await supabase.storage
      .from('listing-images')
      .upload(path, buffer, { contentType, upsert: true })
    if (error) {
      console.error(`  ⚠️ Storage upload failed: ${error.message}`)
      return null
    }
    const { data } = supabase.storage.from('listing-images').getPublicUrl(path)
    return data.publicUrl
  } catch (err) {
    console.error(`  ⚠️ Image error: ${err.message}`)
    return null
  }
}

module.exports = uploadImage
