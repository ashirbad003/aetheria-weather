const https = require('https');

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function testOverpass(cityName, lat, lon) {
    console.log(`\n=== OVERPASS POI DISCOVERY: ${cityName} (${lat}, ${lon}) ===`);
    const q = `[out:json][timeout:10];(
      node["tourism"~"attraction|museum|viewpoint|zoo|theme_park"](around:15000,${lat},${lon});
      node["historic"~"monument|memorial|castle|fort|ruins|archaeological_site|temple"](around:15000,${lat},${lon});
      node["amenity"="place_of_worship"]["name"](around:10000,${lat},${lon});
      way["tourism"~"attraction|museum"](around:15000,${lat},${lon});
      way["historic"~"monument|castle|fort"](around:15000,${lat},${lon});
    );out center 25;`;

    return new Promise((resolve) => {
        const postData = 'data=' + encodeURIComponent(q);
        const req = https.request('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'AetheriaWeatherApp/2.0'
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    const items = (data.elements || []).filter(e => e.tags && e.tags.name);
                    console.log(`Found ${items.length} named POIs for ${cityName}:`);
                    items.slice(0, 10).forEach(e => {
                        const pLat = e.lat || e.center?.lat;
                        const pLon = e.lon || e.center?.lon;
                        const dist = (pLat && pLon) ? calculateDistanceKm(lat, lon, pLat, pLon).toFixed(1) : '?';
                        const type = e.tags.tourism || e.tags.historic || e.tags.amenity || e.tags.leisure || 'landmark';
                        console.log(` - ${e.tags.name} [${type}] (${dist} km away) | Wiki: ${e.tags.wikipedia || e.tags.wikidata || 'no'}`);
                    });
                    resolve(items);
                } catch (err) {
                    console.log('Parse error:', err.message);
                    resolve([]);
                }
            });
        });
        req.on('error', (err) => {
            console.log('Request error:', err.message);
            resolve([]);
        });
        req.write(postData);
        req.end();
    });
}

async function run() {
    await testOverpass('Puri', 19.8135, 85.8312);
    await testOverpass('Bhubaneswar', 20.2961, 85.8245);
    await testOverpass('Paris', 48.8566, 2.3522);
    await testOverpass('Tokyo', 35.6762, 139.6503);
}

run();
