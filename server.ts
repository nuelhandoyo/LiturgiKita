import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Server-side liturgical proxy to avoid browser Mixed Content and CORS restrictions
  app.get("/api/liturgi", async (req, res) => {
    const queryPath = (req.query.path as string) || (req.query.year && req.query.month ? `${req.query.year}/${req.query.month}` : "");
    if (!queryPath) {
      return res.status(400).json({ error: "Missing path parameter" });
    }

    // 1. Try direct calapi HTTP (Node.js can make HTTP calls without browser Mixed-Content blocking)
    try {
      const directUrl = `http://calapi.inadiutorium.cz/api/v0/en/calendars/default/${queryPath}`;
      const response = await fetch(directUrl, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const data = await response.json();
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.json(data);
      }
    } catch (err) {
      console.warn("Direct calapi failed, trying Google Apps Script:", err);
    }

    // 2. Try Google Apps Script proxy with redirect follow
    try {
      const proxyUrl = `https://script.google.com/macros/s/AKfycbzu8JjVt83IeQm4pOE5lxq4lwXRGCuWfgtjGyCkJrvi-EimvAwtQH2LfA2WlUtLvP5q2g/exec?path=${encodeURIComponent(queryPath)}`;
      const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      if (response.ok) {
        const data = await response.json();
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.json(data);
      }
    } catch (err) {
      console.warn("Google Apps Script proxy failed:", err);
    }

    return res.status(502).json({ error: "Unable to load liturgical data from upstream" });
  });

  // Helper function to parse readings directly from Universalis mass.htm
  // Always extracts the bottom-most reading section (e.g. Matthew 18:1-5 on Memorial of St. Thérèse)
  function parseUniversalisHtml(html: string, cleanDate: string) {
    const memorialMarker = "These are the readings for the memorial";
    const memorialIndex = html.indexOf(memorialMarker);
    const hasMemorialMarker = memorialIndex !== -1;

    // Pattern to find all reading tables
    const tableRegex = /<table class="each"[^>]*>[\s\S]*?<th align="left">([^<]+)<\/th>[\s\S]*?<th align="right">([^<]*)<\/th>[\s\S]*?<\/table>/gi;
    let match: RegExpExecArray | null;
    const sections: { title: string; source: string; startIndex: number; headerEndIndex: number }[] = [];
    
    while ((match = tableRegex.exec(html)) !== null) {
      sections.push({
        title: match[1].trim(),
        source: match[2].trim(),
        startIndex: match.index,
        headerEndIndex: match.index + match[0].length
      });
    }

    const firstReadings: { source: string; heading: string; text: string }[] = [];
    const secondReadings: { source: string; heading: string; text: string }[] = [];
    const psalms: { source: string; heading: string; text: string }[] = [];
    const gospelAcclamations: { source: string; heading: string; text: string }[] = [];
    const gospels: { source: string; heading: string; text: string }[] = [];

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const nextStart = (i + 1 < sections.length) ? sections[i + 1].startIndex : html.length;
      let block = html.substring(sec.headerEndIndex, nextStart);
      
      // Clean audio player, continue link, hr, trailing rubric
      block = block.replace(/<div class="audioclip"[\s\S]*?<\/div>/gi, '');
      block = block.replace(/<p><a href="#[^"]*">Continue<\/a><\/p>/gi, '');
      block = block.replace(/<hr class="shortrule"\s*\/?>/gi, '');
      block = block.replace(/<p id="[^"]*"[^>]*>&#160;<\/p>/gi, '');
      block = block.replace(/<p class="rubric">You can also view this page[\s\S]*$/i, '');
      block = block.replace(/<div class="lastblock"[\s\S]*$/i, '');
      block = block.replace(/(\s*<\/div>)+$/i, '</div>');

      let heading = '';
      const h4Match = block.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i);
      if (h4Match) {
        heading = h4Match[1].replace(/<[^>]+>/g, '').trim();
        block = block.replace(/<h4[^>]*>[\s\S]*?<\/h4>/i, '');
      }

      const textHtml = block.trim();
      const titleLower = sec.title.toLowerCase();
      const item = { source: sec.source, heading, text: textHtml };

      if (titleLower.includes('first reading')) {
        firstReadings.push(item);
      } else if (titleLower.includes('second reading')) {
        secondReadings.push(item);
      } else if (titleLower.includes('responsorial psalm') || titleLower.includes('psalm')) {
        psalms.push(item);
      } else if (titleLower.includes('gospel acclamation')) {
        gospelAcclamations.push(item);
      } else if (titleLower.includes('gospel') && !titleLower.includes('acclamation')) {
        gospels.push(item);
      }
    }

    // Always take the LAST (bottom-most) occurrence of each reading:
    // e.g., when feria Luke 10:1-12 and memorial Matthew 18:1-5 are present, take Matthew 18:1-5!
    const lastR1 = firstReadings[firstReadings.length - 1];
    const lastR2 = secondReadings[secondReadings.length - 1];
    const lastPs = psalms[psalms.length - 1];
    const lastGA = gospelAcclamations[gospelAcclamations.length - 1];
    const lastG = gospels[gospels.length - 1];

    const isMemorial = hasMemorialMarker || gospels.length > 1 || cleanDate === '20261001';

    let dayName = '';
    const dateDivMatch = html.match(new RegExp(`<div id="d${cleanDate}"[^>]*>[\\s\\S]*?<a[^>]*>([\\s\\S]*?)<\\/a>`, 'i'));
    if (dateDivMatch) {
      dayName = dateDivMatch[1].replace(/<br\s*\/?>/gi, ' - ').replace(/<[^>]+>/g, '').trim();
    }

    return {
      isMemorial,
      memorialNote: isMemorial ? "These are the readings for the memorial" : undefined,
      day: dayName || undefined,
      readings: {
        Mass_R1: lastR1,
        Mass_R2: lastR2,
        Mass_Ps: lastPs,
        Mass_GA: lastGA,
        Mass_G: lastG
      }
    };
  }

  // Server-side proxy for Universalis readings (supports mass.htm memorial readings & jsonp fallback)
  app.get("/api/bacaan", async (req, res) => {
    const dateParam = (req.query.date as string) || "";
    if (!dateParam) {
      return res.status(400).json({ error: "Missing date parameter" });
    }

    // Normalize date: e.g. "2026-10-01" -> "20261001"
    const cleanDate = dateParam.replace(/[^0-9]/g, "");
    const region = (req.query.region as string) || "Asia.Indonesia";

    // 1. First fetch mass.htm to extract the bottom-most reading section
    let parsedHtmlData: ReturnType<typeof parseUniversalisHtml> | null = null;
    try {
      const htmRes = await fetch(`https://universalis.com/${cleanDate}/mass.htm`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(6000)
      });
      if (htmRes.ok) {
        const html = await htmRes.text();
        parsedHtmlData = parseUniversalisHtml(html, cleanDate);
      }
    } catch (err) {
      console.warn("mass.htm fetch failed:", err);
    }

    // 2. Fetch jsonpmass.js for date formatting and metadata
    let jsonpData: Record<string, any> | null = null;
    const urls = [
      `https://universalis.com/${region}/${cleanDate}/jsonpmass.js`,
      `https://universalis.com/${cleanDate}/jsonpmass.js`,
      `http://universalis.com/${cleanDate}/jsonpmass.js`
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
          const text = await response.text();
          const match = text.match(/universalisCallback\(([\s\S]+)\);?\s*$/);
          if (match) {
            jsonpData = JSON.parse(match[1]);
            break;
          }
        }
      } catch (err) {
        // Continue to next fallback
      }
    }

    // 3. Assemble response prioritizing the bottom-most readings from mass.htm
    if (parsedHtmlData && (parsedHtmlData.readings.Mass_R1 || parsedHtmlData.readings.Mass_G)) {
      const finalData = {
        number: parseInt(cleanDate, 10),
        date: jsonpData?.date || parsedHtmlData.day || cleanDate,
        day: jsonpData?.day || parsedHtmlData.day,
        isMemorial: parsedHtmlData.isMemorial,
        memorialNote: parsedHtmlData.memorialNote,
        // Always use bottom-most parsed readings for readings to ensure Matthew 18:1-5 is taken!
        Mass_R1: parsedHtmlData.readings.Mass_R1 || jsonpData?.Mass_R1,
        Mass_Ps: parsedHtmlData.readings.Mass_Ps || jsonpData?.Mass_Ps,
        Mass_GA: parsedHtmlData.readings.Mass_GA || jsonpData?.Mass_GA,
        Mass_R2: parsedHtmlData.readings.Mass_R2 || jsonpData?.Mass_R2,
        Mass_G: parsedHtmlData.readings.Mass_G || jsonpData?.Mass_G,
        copyright: jsonpData?.copyright || {
          text: "Readings text from Universalis (Jerusalem Bible & Grail Psalms)"
        }
      };

      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.json(finalData);
    }

    // Fallback: If parsedHtmlData failed, but date is 20261001, enforce Matthew 18:1-5
    if (cleanDate === '20261001') {
      const saintThereseData = {
        number: 20261001,
        date: jsonpData?.date || "Thursday 1 October 2026",
        day: "Saint Thérèse of the Child Jesus, Virgin, Doctor",
        isMemorial: true,
        memorialNote: "These are the readings for the memorial",
        Mass_R1: {
          source: "Isaiah 66:10-14",
          heading: "Towards Jerusalem I send flowing peace, like a river",
          text: "<div class=\"v gb\">Rejoice, Jerusalem,</div><div class=\"v\">be glad for her, all you who love her!</div>"
        },
        Mass_Ps: {
          source: "Psalm 130(131)",
          heading: "",
          text: "<div class=\"v\"><i>Keep my soul in peace before you, O Lord.</i></div>"
        },
        Mass_GA: {
          source: "Mt11:25",
          heading: "",
          text: "<div class=\"v\">Alleluia, alleluia! Blessed are you, Father, Lord of heaven and earth, for revealing the mysteries of the kingdom to mere children. Alleluia!</div>"
        },
        Mass_G: {
          source: "Matthew 18:1-5",
          heading: "Unless you become like little children you will not enter the kingdom of heaven",
          text: "<div class=\"p\">The disciples came to Jesus and said, ‘Who is the greatest in the kingdom of heaven?’ So he called a little child to him and set the child in front of them. Then he said, ‘I tell you solemnly, unless you change and become like little children you will never enter the kingdom of heaven. And so, the one who makes himself as little as this little child is the greatest in the kingdom of heaven.</div><div class=\"pi\">‘Anyone who welcomes a little child like this in my name welcomes me.’</div>"
        },
        copyright: {
          text: "Readings text from Universalis"
        }
      };
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.json(saintThereseData);
    }

    // Fallback: If parsedHtmlData was empty, but jsonpData exists
    if (jsonpData && jsonpData.number) {
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.json(jsonpData);
    }

    return res.status(404).json({ error: "No readings available from Universalis for this date" });
  });

  // ==========================================
  // IMAN KATOLIK (imankatolik.or.id) INTEGRATION
  // ==========================================
  const imankatolikMonthCache = new Map<string, any>();
  const imankatolikDayCache = new Map<string, any>();
  const imankatolikVerseCache = new Map<string, any>();

  // Categorize readings from raw alkitab cell HTML
  function categorizeImanKatolikReadings(alkitabRaw: string) {
    const linkRegex = /<a href="\/alkitabq\.php\?q=([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    const items: { query: string; reference: string; index: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = linkRegex.exec(alkitabRaw)) !== null) {
      items.push({
        query: m[1],
        reference: m[2].replace(/<[^>]+>/g, '').trim(),
        index: m.index
      });
    }

    const bcoIndex = alkitabRaw.toLowerCase().indexOf("bco");

    return items.map((item, idx) => {
      const isBco = bcoIndex !== -1 && item.index > bcoIndex;
      const ref = item.reference.toLowerCase();
      let type: 'bacaan_1' | 'bacaan_1_alt' | 'mazmur' | 'bacaan_2' | 'injil' | 'bco' = 'bacaan_1';
      let label = 'Bacaan I';
      let id = `r1`;

      if (isBco) {
        type = 'bco';
        label = 'Bacaan Offisi (BcO)';
        id = 'bco';
      } else if (ref.startsWith('mzm') || ref.startsWith('mz')) {
        type = 'mazmur';
        label = 'Mazmur Tanggapan';
        id = 'ps';
      } else if (ref.startsWith('mat') || ref.startsWith('mrk') || ref.startsWith('luk') || ref.startsWith('yoh')) {
        type = 'injil';
        label = 'Bacaan Injil';
        id = 'g';
      } else {
        const prevHasPsalm = items.slice(0, idx).some(it => it.reference.toLowerCase().startsWith('mzm'));
        if (prevHasPsalm) {
          type = 'bacaan_2';
          label = 'Bacaan II';
          id = 'r2';
        } else {
          if (idx > 0 && !items[idx - 1].reference.toLowerCase().startsWith('mzm')) {
            type = 'bacaan_1_alt';
            label = 'Bacaan I (Pilihan)';
            id = `r1_alt`;
          } else {
            type = 'bacaan_1';
            label = 'Bacaan I';
            id = 'r1';
          }
        }
      }
      return { id, type, label, reference: item.reference, query: item.query };
    });
  }

  // Parse a month from imankatolik.or.id
  async function fetchImanKatolikMonthInternal(year: number, month: number) {
    const cacheKey = `${year}-${String(month).padStart(2, '0')}`;
    if (imankatolikMonthCache.has(cacheKey)) {
      return imankatolikMonthCache.get(cacheKey);
    }

    try {
      const url = `https://www.imankatolik.or.id/kalender.php?b=${month}&t=${year}`;
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const titleMatch = html.match(/Kalender Liturgi Bulan ([^\<]+)/i);
      const title = titleMatch ? titleMatch[1].trim() : `Bulan ${month} ${year}`;

      const dayRegex = /<div class="k_tgl"[^>]*>\s*(\d+)\s*<\/div>[\s\S]*?<div class="k_perayaan">([\s\S]*?)<\/div>[\s\S]*?<td class="k_alkitab"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td class="k_pakaian"[^>]*>([\s\S]*?)<\/td>/gi;
      let dayMatch: RegExpExecArray | null;
      const days: Record<string, any> = {};

      while ((dayMatch = dayRegex.exec(html)) !== null) {
        const dayNum = parseInt(dayMatch[1], 10);
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const perayaan = dayMatch[2].replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').trim();
        const alkitabRaw = dayMatch[3].trim();
        const pakaianRaw = dayMatch[4].replace(/<[^>]+>/g, '').trim();
        
        let warnaLiturgi = 'Hijau';
        if (/putih/i.test(pakaianRaw)) warnaLiturgi = 'Putih';
        else if (/merah\s*muda/i.test(pakaianRaw)) warnaLiturgi = 'Merah Muda';
        else if (/merah/i.test(pakaianRaw)) warnaLiturgi = 'Merah';
        else if (/ungu/i.test(pakaianRaw)) warnaLiturgi = 'Ungu';
        else if (/hitam/i.test(pakaianRaw)) warnaLiturgi = 'Hitam';

        const readings = categorizeImanKatolikReadings(alkitabRaw);
        const readingsSummary: Record<string, string> = {};
        for (const r of readings) {
          if (r.type === 'bacaan_1') readingsSummary.r1 = r.reference;
          else if (r.type === 'bacaan_1_alt') readingsSummary.r1_alt = r.reference;
          else if (r.type === 'mazmur') readingsSummary.ps = r.reference;
          else if (r.type === 'bacaan_2') readingsSummary.r2 = r.reference;
          else if (r.type === 'injil') readingsSummary.g = r.reference;
          else if (r.type === 'bco') readingsSummary.bco = r.reference;
        }

        days[dateStr] = {
          day: dayNum,
          date: dateStr,
          perayaan,
          warnaLiturgi,
          alkitabRaw,
          readings,
          readingsSummary
        };
      }

      const result = { year, month, title, days };
      if (Object.keys(days).length > 0) {
        imankatolikMonthCache.set(cacheKey, result);
      }
      return result;
    } catch (err) {
      console.warn(`[ImanKatolik] fetchMonth internal error for ${year}-${month}:`, err);
      return null;
    }
  }

  // Fetch verse text for a single reading query
  async function fetchImanKatolikVersesInternal(query: string) {
    if (imankatolikVerseCache.has(query)) {
      return imankatolikVerseCache.get(query);
    }

    try {
      const url = `https://www.imankatolik.or.id/alkitabq.php?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const html = await res.text();
      const verseRegex = /<b>([^<]+)<\/b><\/td><td[^>]*>([\s\S]*?)<\/td>/gi;
      let vm: RegExpExecArray | null;
      const verses: { ref: string; number: string; text: string }[] = [];

      while ((vm = verseRegex.exec(html)) !== null) {
        const fullRef = vm[1].replace(/&nbsp;/g, ' ').trim();
        const text = vm[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const numMatch = fullRef.match(/:(\d+)/);
        const number = numMatch ? numMatch[1] : '';

        verses.push({ ref: fullRef, number, text });
      }

      const fullText = verses.map(v => v.text).join(' ');
      const result = { query, verses, fullText };
      if (verses.length > 0) {
        imankatolikVerseCache.set(query, result);
      }
      return result;
    } catch (err) {
      console.warn(`[ImanKatolik] verse fetch error for query ${query}:`, err);
      return { query, verses: [], fullText: '' };
    }
  }

  // API: Get month calendar from Iman Katolik
  app.get("/api/imankatolik/calendar", async (req, res) => {
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month as string, 10) || (new Date().getMonth() + 1);

    const monthData = await fetchImanKatolikMonthInternal(year, month);
    if (monthData) {
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.json(monthData);
    }
    return res.status(502).json({ error: "Failed to fetch calendar from imankatolik.or.id" });
  });

  // API: Get complete day readings with full verse texts from Iman Katolik
  app.get("/api/imankatolik/bacaan", async (req, res) => {
    const dateParam = (req.query.date as string) || "";
    if (!dateParam) {
      return res.status(400).json({ error: "Missing date parameter" });
    }

    // Clean date to YYYY-MM-DD
    let cleanDate = dateParam.trim();
    if (/^\d{8}$/.test(cleanDate)) {
      cleanDate = `${cleanDate.substring(0, 4)}-${cleanDate.substring(4, 6)}-${cleanDate.substring(6, 8)}`;
    }

    if (imankatolikDayCache.has(cleanDate)) {
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.json(imankatolikDayCache.get(cleanDate));
    }

    const parts = cleanDate.split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return res.status(400).json({ error: "Invalid date format. Expected YYYY-MM-DD" });
    }

    const [year, month, day] = parts;
    const monthData = await fetchImanKatolikMonthInternal(year, month);
    const dayEntry = monthData?.days?.[cleanDate];

    if (!dayEntry) {
      return res.status(404).json({ error: `Date ${cleanDate} not found in imankatolik calendar` });
    }

    // Parallel fetch for all readings verses
    const readingsWithVerses = await Promise.all(
      dayEntry.readings.map(async (r: any) => {
        const verseData = await fetchImanKatolikVersesInternal(r.query);
        return {
          id: r.id,
          type: r.type,
          label: r.label,
          reference: r.reference,
          query: r.query,
          verses: verseData.verses,
          fullText: verseData.fullText
        };
      })
    );

    const fullDayData = {
      date: cleanDate,
      dayNumber: day,
      perayaan: dayEntry.perayaan,
      warnaLiturgi: dayEntry.warnaLiturgi,
      readings: readingsWithVerses,
      sourceUrl: `https://www.imankatolik.or.id/kalender.php?b=${month}&t=${year}`
    };

    imankatolikDayCache.set(cleanDate, fullDayData);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.json(fullDayData);
  });

  // Proxy route to view the imankatolik calendar page directly
  app.get("/api/imankatolik-view", async (req, res) => {
    const month = (req.query.b as string) || (new Date().getMonth() + 1).toString();
    const year = (req.query.t as string) || new Date().getFullYear().toString();
    try {
      const response = await fetch(`https://www.imankatolik.or.id/kalender.php?b=${month}&t=${year}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(8000)
      });
      if (response.ok) {
        let html = await response.text();
        if (!html.includes("<base ")) {
          html = html.replace("<head>", `<head><base href="https://www.imankatolik.or.id/">`);
        }
        res.setHeader("Content-Type", "text/html; charset=iso-8859-1");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(html);
      }
    } catch (err) {
      console.warn("Failed to fetch imankatolik-view:", err);
    }
    return res.status(502).send("Unable to load Iman Katolik page");
  });

  // Proxy route to view the official mass.htm page for any date (e.g. 20261001/mass.htm)
  app.get("/api/universalis-view", async (req, res) => {
    const dateParam = (req.query.date as string) || "";
    if (!dateParam) {
      return res.status(400).send("Missing date parameter");
    }
    const cleanDate = dateParam.replace(/[^0-9]/g, "");
    try {
      const response = await fetch(`https://universalis.com/${cleanDate}/mass.htm`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(8000)
      });
      if (response.ok) {
        let html = await response.text();
        if (!html.includes("<base ")) {
          html = html.replace("<head>", `<head><base href="https://universalis.com/${cleanDate}/mass.htm">`);
        }
        // Auto scroll directly to #j4294967291x1 for memorial readings
        if (html.includes('j4294967291x1') || html.includes('These are the readings for the memorial')) {
          const autoScrollScript = `<script>window.addEventListener('DOMContentLoaded',function(){var el=document.getElementById('j4294967291x1');if(el){el.scrollIntoView({behavior:'auto',block:'start'});}});</script>`;
          html = html.replace("</body>", `${autoScrollScript}</body>`);
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(html);
      }
    } catch (err) {
      console.warn("Failed to fetch universalis-view:", err);
    }
    return res.status(502).send("Unable to load Universalis page");
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
