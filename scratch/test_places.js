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

function classifyPlace(title, extract) {
    const text = (title + ' ' + (extract || '')).toLowerCase();
    if (/temple|mandir|church|cathedral|mosque|shrine|monastery|pagoda|basilica|gurdwara|synagogue|sanctum|deity|hindu|buddhist|christian|islamic|abbey/.test(text)) {
        return { category: 'Religious Heritage', icon: '🛕' };
    }
    if (/fort|palace|castle|monument|tomb|mausoleum|citadel|heritage|archaeolog|ancient|ruin|memorial|historic|dynasty|empire|gate|pillar/.test(text)) {
        return { category: 'Historical Landmark', icon: '🏰' };
    }
    if (/beach|waterfall|lake|river|hill|mountain|peak|island|forest|valley|sanctuary|wildlife|park|garden|botanical|nature|reef|cliff/.test(text)) {
        return { category: 'Nature & Scenic', icon: '🌿' };
    }
    if (/museum|gallery|theatre|theater|exhibition|cultural|art|planetarium|aquarium|observatory|opera|library/.test(text)) {
        return { category: 'Cultural & Arts', icon: '🏛️' };
    }
    if (/tower|bridge|square|plaza|promenade|market|bazaar|ferris|statue|center|landmark|viewpoint|lookout|stadium/.test(text)) {
        return { category: 'Notable Landmark', icon: '📍' };
    }
    return { category: 'Attraction & Leisure', icon: '⭐' };
}

function fetchJson(url) {
    return new Promise((resolve) => {
        https.get(url, { headers: { 'User-Agent': 'AetheriaWeather/2.0 (student@example.edu)' } }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } catch (e) { resolve({}); }
            });
        }).on('error', () => resolve({}));
    });
}

async function discoverPlaces(cityName, state, country, lat, lon) {
    console.log(`\n========================================`);
    console.log(`📍 EXPLORE ${cityName.toUpperCase()} (${lat}, ${lon})`);
    console.log(`========================================`);

    // 1. Geosearch around center coordinates
    const geoUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat}|${lon}&ggsradius=15000&ggslimit=50&prop=pageimages|extracts|info|coordinates&piprop=thumbnail&pithumbsize=600&exintro=1&explaintext=1&exchars=280&inprop=url&format=json&origin=*`;
    
    // 2. Specific search for famous places of the city
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent('"' + cityName + '" tourist attraction OR temple OR museum OR monument OR fort OR beach OR park')}&gsrlimit=25&prop=pageimages|extracts|info|coordinates&piprop=thumbnail&pithumbsize=600&exintro=1&explaintext=1&exchars=280&inprop=url&format=json&origin=*`;

    const [geoRes, searchRes] = await Promise.all([fetchJson(geoUrl), fetchJson(searchUrl)]);

    const allPages = {
        ...(geoRes.query?.pages || {}),
        ...(searchRes.query?.pages || {})
    };

    const excludeRegex = /^(list of|history of|geography of|demographics of|economy of|politics of|climate of|transport in|education in|neighbourhoods in|timeline of|flag of|seal of|mayors of|elections in|crime in|cuisine of|media in|culture of|tourism in|outline of|sports in)/i;

    const candidates = [];
    const seen = new Set();

    for (const p of Object.values(allPages)) {
        if (!p.title || !p.extract) continue;
        const tLower = p.title.toLowerCase().trim();

        if (seen.has(tLower) || 
            tLower === cityName.toLowerCase() || 
            tLower === `${cityName.toLowerCase()} district` || 
            tLower === `${cityName.toLowerCase()} (city)` || 
            excludeRegex.test(tLower)) {
            continue;
        }

        if (/constituency|election|ministry|department of|derailment|accident|epidemic|treaty|government of|police/i.test(tLower)) {
            continue;
        }

        const pLat = p.coordinates?.[0]?.lat;
        const pLon = p.coordinates?.[0]?.lon;
        let distKm = null;

        if (typeof pLat === 'number' && typeof pLon === 'number') {
            distKm = calculateDistanceKm(lat, lon, pLat, pLon);
            if (distKm > 40) continue;
        } else {
            // If article lacks geocoordinates, ensure it strongly discusses this city
            if (!p.extract.toLowerCase().includes(cityName.toLowerCase())) {
                continue;
            }
        }

        const classification = classifyPlace(p.title, p.extract);
        seen.add(tLower);

        let score = 0;
        if (p.thumbnail?.source) score += 10;
        if (classification.category === 'Religious Heritage') score += 9;
        if (classification.category === 'Historical Landmark') score += 9;
        if (classification.category === 'Nature & Scenic') score += 8;
        if (classification.category === 'Cultural & Arts') score += 8;
        if (classification.category === 'Notable Landmark') score += 7;

        if (distKm !== null) {
            if (distKm <= 5) score += 8;
            else if (distKm <= 15) score += 5;
            else if (distKm <= 25) score += 2;
        }

        // Clean up title
        const cleanTitle = p.title.replace(/\s*\([^)]*\)$/, '').trim();

        candidates.push({
            id: p.pageid,
            title: cleanTitle,
            fullTitle: p.title,
            category: classification.category,
            icon: classification.icon,
            extract: p.extract.trim(),
            imageUrl: p.thumbnail?.source || null,
            pageUrl: p.fullurl || `https://en.wikipedia.org/?curid=${p.pageid}`,
            latitude: typeof pLat === 'number' ? pLat : lat,
            longitude: typeof pLon === 'number' ? pLon : lon,
            distanceKm: distKm !== null ? parseFloat(distKm.toFixed(1)) : null,
            score: score
        });
    }

    candidates.sort((a, b) => b.score - a.score);
    const results = candidates.slice(0, 8);

    results.forEach((p, idx) => {
        console.log(`${idx + 1}. ${p.icon} ${p.title} [${p.category}] ${p.distanceKm !== null ? `(${p.distanceKm} km)` : ''}`);
        console.log(`   Image: ${p.imageUrl ? 'YES' : 'NONE'}`);
        console.log(`   Summary: ${p.extract.substring(0, 95)}...`);
    });

    return results;
}

async function run() {
    await discoverPlaces('Puri', 'Odisha', 'India', 19.8135, 85.8312);
    await discoverPlaces('Bhubaneswar', 'Odisha', 'India', 20.2961, 85.8245);
    await discoverPlaces('Delhi', 'Delhi', 'India', 28.6139, 77.2090);
    await discoverPlaces('Paris', 'Île-de-France', 'France', 48.8566, 2.3522);
    await discoverPlaces('Tokyo', 'Tokyo', 'Japan', 35.6762, 139.6503);
    await discoverPlaces('Berhampur', 'Odisha', 'India', 19.3115, 84.7929);
}

run();
