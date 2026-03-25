/**
 * Geocoding utility for Roof scrapers
 * 
 * Uses OpenStreetMap Nominatim (free fallback)
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function geocode(address, city = '', zipcode = '') {
  if (!address && !zipcode) return null;

  // Build a precise query using available components
  let queryParts = [];
  if (address) queryParts.push(address);
  if (zipcode) queryParts.push(zipcode);
  if (city) queryParts.push(city);
  queryParts.push('Netherlands');

  const query = queryParts.join(', ');

  // 1. Try Nominatim (Primary)
  try {
    // Nominatim requires a User-Agent and recommends 1 request per second
    await sleep(1000); // Respect TOS
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'RoofApp-Scraper/1.1 (contact@roof.app)' }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        console.log(`    🌍 Geocoded (Nominatim): ${query} -> (${lat}, ${lon})`);
        return { lat, lon, display_name: data[0].display_name };
      }
    } else if (res.status === 429) {
      console.warn(`    ⚠️ Nominatim "Too Many Requests". Falling back...`);
    }
  } catch (err) {
    console.warn(`    ⚠️ Nominatim error: ${err.message}. Falling back...`);
  }

  // 2. Try Photon (Fallback - OSM Based)
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(photonUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [lon, lat] = feature.geometry.coordinates; // Photon returns [lon, lat]
        console.log(`    🌍 Geocoded (Photon/OSM): ${query} -> (${lat}, ${lon})`);
        return { lat, lon, display_name: feature.properties.name || query };
      }
    }
  } catch (err) {
    console.error(`    ❌ Photon fallback error: ${err.message}`);
  }
  
  return null;
}

/**
 * Extracts coordinates from raw HTML strings using regex
 * Works for Pararius and some other sites that embed data in scripts
 */
function extractCoordsFromHtml(html) {
  const latMatch = html.match(/["']?latitude["']?\s*[:=]\s*["']?([-+]?\d+\.\d+)["']?/i);
  const lonMatch = html.match(/["']?longitude["']?\s*[:=]\s*["']?([-+]?\d+\.\d+)["']?/i);
  
  if (latMatch && lonMatch) {
    return {
      lat: parseFloat(latMatch[1]),
      lon: parseFloat(lonMatch[2] || lonMatch[1]) // Handle common capture group patterns
    };
  }

  // Fallback for lat/lng property names
  const latMatch2 = html.match(/["']?lat["']?\s*[:=]\s*["']?([-+]?\d+\.\d+)["']?/i);
  const lngMatch2 = html.match(/["']?lng["']?\s*[:=]\s*["']?([-+]?\d+\.\d+)["']?/i);

  if (latMatch2 && lngMatch2) {
    return {
      lat: parseFloat(latMatch2[1]),
      lon: parseFloat(lngMatch2[1])
    };
  }

  return null;
}

/**
 * Extracts a Dutch zipcode (4 digits + 2 letters) from HTML
 */
function extractZipcodeFromHtml(html) {
  const match = html.match(/(\d{4}\s?[A-Z]{2})/);
  return match ? match[1].replace(/\s+/g, ' ') : null;
}

module.exports = {
  geocode,
  extractCoordsFromHtml,
  extractZipcodeFromHtml
};
