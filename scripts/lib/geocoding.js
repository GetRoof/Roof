/**
 * Geocoding utility for Roof scrapers
 * 
 * Uses OpenStreetMap Nominatim (free fallback)
 */

async function geocode(address, city = '', zipcode = '') {
  if (!address && !zipcode) return null;

  // Build a precise query using available components
  let queryParts = [];
  if (address) queryParts.push(address);
  if (zipcode) queryParts.push(zipcode);
  if (city) queryParts.push(city);
  queryParts.push('Netherlands');

  const query = queryParts.join(', ');
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

  try {
    // Nominatim requires a User-Agent
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'RoofApp-Scraper/1.0 (contact@roof.app)',
      }
    });

    if (!res.ok) {
      console.warn(`    ⚠️ Geocoding failed for ${query}: ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      console.log(`    🌍 Geocoded: ${query} -> (${lat}, ${lon})`);
      return {
        lat,
        lon,
        display_name: data[0].display_name
      };
    }
    
    return null;
  } catch (err) {
    console.error(`    ❌ Geocoding error for ${query}:`, err.message);
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
