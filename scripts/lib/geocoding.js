/**
 * Geocoding utility for Roof scrapers
 * 
 * Uses OpenStreetMap Nominatim (free fallback)
 */

async function geocode(address, city = '') {
  if (!address) return null;

  const query = `${address}${city ? ', ' + city : ''}, Netherlands`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

  try {
    // Nominatim requires a User-Agent
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'RoofApp-Scraper/1.0 (contact@roof.app)',
      }
    });

    if (!res.ok) {
      console.warn(`  ⚠️ Geocoding failed for ${query}: ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };
    }
    
    return null;
  } catch (err) {
    console.error(`  ❌ Geocoding error for ${query}:`, err.message);
    return null;
  }
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
      lon: parseFloat(lonMatch[1])
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

module.exports = {
  geocode,
  extractCoordsFromHtml
};
