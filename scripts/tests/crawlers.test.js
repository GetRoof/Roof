const { extractCoordsFromHtml, geocode } = require('../lib/geocoding');

async function testExtraction() {
  console.log('🧪 Testing regex extraction...');
  
  const sampleHtml = `
    <html>
      <script>
        var data = {
          "latitude": 52.370216,
          "longitude": 4.895168
        };
      </script>
    </html>
  `;
  
  const coords = extractCoordsFromHtml(sampleHtml);
  if (coords && coords.lat === 52.370216 && coords.lon === 4.895168) {
    console.log('✅ Regex extraction passed');
  } else {
    console.error('❌ Regex extraction failed:', coords);
  }

  const sampleHtml2 = `
    <html>
      <script>
        window.__INITIAL_STATE__ = { "lat": 51.9225, "lng": 4.47917 };
      </script>
    </html>
  `;
  const coords2 = extractCoordsFromHtml(sampleHtml2);
  if (coords2 && coords2.lat === 51.9225 && coords2.lon === 4.47917) {
    console.log('✅ Regex extraction 2 passed');
  } else {
    console.error('❌ Regex extraction 2 failed:', coords2);
  }
}

async function testGeocoding() {
  console.log('\n🧪 Testing geocoding (Nominatim)...');
  
  const result = await geocode('Damrak 1', 'Amsterdam');
  if (result && result.lat && result.lon) {
    console.log('✅ Geocoding passed:', result);
  } else {
    console.error('❌ Geocoding failed');
  }
}

async function runTests() {
  await testExtraction();
  await testGeocoding();
}

runTests().catch(err => console.error(err));
