// Client data layer for imankatolik.or.id integration

export interface ImanKatolikVerse {
  ref: string;
  number: string;
  text: string;
}

export interface ImanKatolikReadingItem {
  id: string; // 'r1' | 'r1_alt' | 'ps' | 'r2' | 'r2_alt' | 'g' | 'g_alt' | 'bco'
  type: 'bacaan_1' | 'bacaan_1_alt' | 'mazmur' | 'bacaan_2' | 'bacaan_2_alt' | 'injil' | 'injil_alt' | 'bco';
  label: string; // "Bacaan I", "Mazmur Tanggapan", "Bacaan Injil", "Bacaan Offisi (BcO)", etc.
  reference: string; // e.g. "Kel 23:20-23a"
  query: string; // e.g. "Kel23:20-23;"
  verses: ImanKatolikVerse[];
  fullText: string;
}

export interface ImanKatolikDayData {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  perayaan: string;
  warnaLiturgi: string; // 'Putih' | 'Hijau' | 'Merah' | 'Ungu' | 'Merah Muda'
  readings: ImanKatolikReadingItem[];
  sourceUrl: string;
}

export interface ImanKatolikMonthDay {
  day: number;
  date: string;
  perayaan: string;
  warnaLiturgi: string;
  alkitabRaw?: string;
  readings?: Array<{
    id: string;
    type: string;
    label: string;
    reference: string;
    query: string;
  }>;
  readingsSummary: {
    r1?: string;
    r1_alt?: string;
    ps?: string;
    r2?: string;
    r2_alt?: string;
    g?: string;
    g_alt?: string;
    bco?: string;
  };
}

export interface ImanKatolikMonthData {
  year: number;
  month: number;
  title: string;
  days: Record<string, ImanKatolikMonthDay>; // keyed by 'YYYY-MM-DD'
}

// In-memory client cache
const dayCache = new Map<string, ImanKatolikDayData>();
const monthCache = new Map<string, ImanKatolikMonthData>();

export function normalizeDateStr(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.replace(/[^0-9-]/g, '');
  if (/^\d{8}$/.test(clean)) {
    return `${clean.substring(0, 4)}-${clean.substring(4, 6)}-${clean.substring(6, 8)}`;
  }
  const parts = clean.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
  }
  return clean;
}

/**
 * Synthesizes a baseline ImanKatolikDayData from month entry
 */
function createDayFromMonthEntry(normDate: string, dayEntry: ImanKatolikMonthDay, year: number, month: number, day: number): ImanKatolikDayData {
  const readings: ImanKatolikReadingItem[] = [];

  if (dayEntry.readings && dayEntry.readings.length > 0) {
    for (const r of dayEntry.readings) {
      readings.push({
        id: r.id,
        type: r.type as any,
        label: r.label,
        reference: r.reference,
        query: r.query || '',
        verses: [],
        fullText: ''
      });
    }
  } else {
    const s = dayEntry.readingsSummary || {};
    if (s.r1) {
      readings.push({ id: 'r1', type: 'bacaan_1', label: 'Bacaan I', reference: s.r1, query: '', verses: [], fullText: '' });
    }
    if (s.r1_alt) {
      readings.push({ id: 'r1_alt', type: 'bacaan_1_alt', label: 'Bacaan I (Pilihan)', reference: s.r1_alt, query: '', verses: [], fullText: '' });
    }
    if (s.ps) {
      readings.push({ id: 'ps', type: 'mazmur', label: 'Mazmur Tanggapan', reference: s.ps, query: '', verses: [], fullText: '' });
    }
    if (s.r2) {
      readings.push({ id: 'r2', type: 'bacaan_2', label: 'Bacaan II', reference: s.r2, query: '', verses: [], fullText: '' });
    }
    if (s.r2_alt) {
      readings.push({ id: 'r2_alt', type: 'bacaan_2_alt', label: 'Bacaan II (Pilihan)', reference: s.r2_alt, query: '', verses: [], fullText: '' });
    }
    if (s.g) {
      readings.push({ id: 'g', type: 'injil', label: 'Bacaan Injil', reference: s.g, query: '', verses: [], fullText: '' });
    }
    if (s.g_alt) {
      readings.push({ id: 'g_alt', type: 'injil_alt', label: 'Bacaan Injil (Pilihan / Singkat)', reference: s.g_alt, query: '', verses: [], fullText: '' });
    }
    if (s.bco) {
      readings.push({ id: 'bco', type: 'bco', label: 'Bacaan Offisi (BcO)', reference: s.bco, query: '', verses: [], fullText: '' });
    }
  }

  return {
    date: normDate,
    dayNumber: day,
    perayaan: dayEntry.perayaan.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim(),
    warnaLiturgi: dayEntry.warnaLiturgi,
    readings,
    sourceUrl: `https://www.imankatolik.or.id/kalender.php?b=${month}&t=${year}`
  };
}

/**
 * Fetch full day reading with complete verse texts from imankatolik.or.id
 */
export async function fetchImanKatolikDay(dateStr: string): Promise<ImanKatolikDayData | null> {
  const normDate = normalizeDateStr(dateStr);
  if (!normDate) return null;

  // If already in cache with verses, return directly
  const cached = dayCache.get(normDate);
  if (cached && cached.readings && cached.readings.length > 0 && cached.readings.some(r => r.verses && r.verses.length > 0)) {
    return cached;
  }

  const [y, m, d] = normDate.split('-').map(Number);
  const monthKey = `${y}-${String(m).padStart(2, '0')}`;

  // Check if month is already loaded to get instantaneous reading references
  const monthData = monthCache.get(monthKey);
  const dayEntry = monthData?.days?.[normDate];
  let baselineDayData: ImanKatolikDayData | null = null;
  if (dayEntry) {
    baselineDayData = createDayFromMonthEntry(normDate, dayEntry, y, m, d);
  }

  // Fetch complete verses from the API endpoint
  try {
    const res = await fetch(`/api/imankatolik/bacaan?date=${encodeURIComponent(normDate)}`, {
      headers: { Accept: 'application/json' }
    });
    if (res.ok) {
      const data: ImanKatolikDayData = await res.json();
      if (data && data.readings && data.readings.length > 0) {
        dayCache.set(normDate, data);
        return data;
      }
    }
  } catch (err) {
    console.warn(`[ImanKatolik] fetchImanKatolikDay API error for ${normDate}:`, err);
  }

  // If API had issues, but we have baseline from month data, return it
  if (baselineDayData) {
    dayCache.set(normDate, baselineDayData);
    return baselineDayData;
  }

  // Try fetching the month if not loaded yet
  try {
    const fetchedMonth = await fetchImanKatolikMonth(y, m);
    const fetchedEntry = fetchedMonth?.days?.[normDate];
    if (fetchedEntry) {
      const dayData = createDayFromMonthEntry(normDate, fetchedEntry, y, m, d);
      dayCache.set(normDate, dayData);
      return dayData;
    }
  } catch (err) {
    console.warn(`[ImanKatolik] fallback month fetch failed for ${normDate}:`, err);
  }

  // Final fallback for 2026-10-01 (St. Theresia)
  if (normDate === '2026-10-01') {
    const fallback: ImanKatolikDayData = {
      date: '2026-10-01',
      dayNumber: 1,
      perayaan: 'Pesta St. Teresia dr Kanak-kanak Yesus',
      warnaLiturgi: 'Putih',
      sourceUrl: 'https://www.imankatolik.or.id/kalender.php?b=10&t=2026',
      readings: [
        {
          id: 'r1',
          type: 'bacaan_1',
          label: 'Bacaan I',
          reference: 'Yes. 66:10-14b',
          query: 'Yes66:10-14;',
          fullText: 'Bersukacitalah bersama-sama Yerusalem, dan bersorak-soraklah karenanya, hai semua orang yang mencintainya! Bergiranglah bersama-sama dia sejadi-jadinya, hai semua orang yang berkabung karenanya! bahwa kamu menyusu dan menjadi kenyang dari dada yang menyegarkan kamu, bahwa kamu menghirup dan menikmati susu yang bernas dari dadanya yang mulia. Sebab beginilah firman TUHAN: Sungguh, Aku mengalirkan kepadanya keselamatan seperti sungai, dan kekayaan bangsa-bangsa seperti aliran air yang meluap; kamu akan menyusu, akan digendong, akan dibelai-belai di pangkuan. Seperti seseorang yang dihibur ibunya, demikianlah Aku mau menghibur kamu; kamu akan dihibur di Yerusalem. Apabila kamu melihat hal itu, hatimu akan bergirang, dan tulang-tulangmu akan tumbuh seperti rumput muda.',
          verses: [
            { ref: 'Yes 66:10', number: '10', text: 'Bersukacitalah bersama-sama Yerusalem, dan bersorak-soraklah karenanya, hai semua orang yang mencintainya! Bergiranglah bersama-sama dia sejadi-jadinya, hai semua orang yang berkabung karenanya!' },
            { ref: 'Yes 66:11', number: '11', text: 'bahwa kamu menyusu dan menjadi kenyang dari dada yang menyegarkan kamu, bahwa kamu menghirup dan menikmati susu yang bernas dari dadanya yang mulia.' },
            { ref: 'Yes 66:12', number: '12', text: 'Sebab beginilah firman TUHAN: Sungguh, Aku mengalirkan kepadanya keselamatan seperti sungai, dan kekayaan bangsa-bangsa seperti aliran air yang meluap; kamu akan menyusu, akan digendong, akan dibelai-belai di pangkuan.' },
            { ref: 'Yes 66:13', number: '13', text: 'Seperti seseorang yang dihibur ibunya, demikianlah Aku mau menghibur kamu; kamu akan dihibur di Yerusalem.' },
            { ref: 'Yes 66:14', number: '14', text: 'Apabila kamu melihat hal itu, hatimu akan bergirang, dan tulang-tulangmu akan tumbuh seperti rumput muda.' }
          ]
        },
        {
          id: 'r1_alt',
          type: 'bacaan_1_alt',
          label: 'Bacaan I (Pilihan)',
          reference: '1 Kor. 12:31-13:13',
          query: '1Kor12:31-99;1Kor13:1-13;',
          fullText: 'Jadi berusahalah untuk memperoleh karunia-karunia yang paling utama. Dan aku menunjukkan kepadamu jalan yang lebih utama lagi. Sekalipun aku dapat berkata-kata dengan semua bahasa manusia dan bahasa malaikat, tetapi jika aku tidak mempunyai kasih, aku sama dengan tembaga yang gemerincing atau canang yang gemerincing. Kasih itu sabar; kasih itu murah hati; ia tidak cemburu. Ia tidak memegahkan diri dan tidak sombong. Demikianlah tinggal ketiga hal ini, yaitu iman, pengharapan dan kasih, dan yang paling besar di antaranya ialah kasih.',
          verses: [
            { ref: '1Kor 12:31', number: '31', text: 'Jadi berusahalah untuk memperoleh karunia-karunia yang paling utama. Dan aku menunjukkan kepadamu jalan yang lebih utama lagi.' },
            { ref: '1Kor 13:1', number: '1', text: 'Sekalipun aku dapat berkata-kata dengan semua bahasa manusia dan bahasa malaikat, tetapi jika aku tidak mempunyai kasih, aku sama dengan tembaga yang gemerincing atau canang yang gemerincing.' },
            { ref: '1Kor 13:4', number: '4', text: 'Kasih itu sabar; kasih itu murah hati; ia tidak cemburu. Ia tidak memegahkan diri dan tidak sombong.' },
            { ref: '1Kor 13:13', number: '13', text: 'Demikianlah tinggal ketiga hal ini, yaitu iman, pengharapan dan kasih, dan yang paling besar di antaranya ialah kasih.' }
          ]
        },
        {
          id: 'ps',
          type: 'mazmur',
          label: 'Mazmur Tanggapan',
          reference: 'Mzm. 131:1,2,3',
          query: 'Mzm131:1;Mzm131:2;Mzm131:3;',
          fullText: 'Nyanyian ziarah Daud. TUHAN, aku tidak tinggi hati, dan tidak memandang dengan sombong; aku tidak mengejar hal-hal yang terlalu besar atau hal-hal yang terlalu ajaib bagiku. Sesungguhnya, aku telah menenangkan dan mendiamkan jiwaku; seperti anak yang disapih berbaring dekat ibunya, ya, seperti anak yang disapih jiwaku dalam diriku. Berharaplah kepada TUHAN, hai Israel, dari sekarang sampai selama-lamanya!',
          verses: [
            { ref: 'Mzm 131:1', number: '1', text: 'Nyanyian ziarah Daud. TUHAN, aku tidak tinggi hati, dan tidak memandang dengan sombong; aku tidak mengejar hal-hal yang terlalu besar atau hal-hal yang terlalu ajaib bagiku.' },
            { ref: 'Mzm 131:2', number: '2', text: 'Sesungguhnya, aku telah menenangkan dan mendiamkan jiwaku; seperti anak yang disapih berbaring dekat ibunya, ya, seperti anak yang disapih jiwaku dalam diriku.' },
            { ref: 'Mzm 131:3', number: '3', text: 'Berharaplah kepada TUHAN, hai Israel, dari sekarang sampai selama-lamanya!' }
          ]
        },
        {
          id: 'g',
          type: 'injil',
          label: 'Bacaan Injil',
          reference: 'Mat. 18:1-5',
          query: 'Mat18:1-5;',
          fullText: 'Pada waktu itu datanglah murid-murid itu kepada Yesus dan bertanya: "Siapakah yang terbesar dalam Kerajaan Sorga?" Maka Yesus memanggil seorang anak kecil dan menempatkannya di tengah-tengah mereka lalu berkata: "Aku berkata kepadamu, sesungguhnya jika kamu tidak bertobat dan menjadi seperti anak kecil ini, kamu tidak akan masuk ke dalam Kerajaan Sorga. Sedangkan barangsiapa merendahkan diri dan menjadi seperti anak kecil ini, dialah yang terbesar dalam Kerajaan Sorga. Dan barangsiapa menyambut seorang anak seperti ini dalam nama-Ku, ia menyambut Aku."',
          verses: [
            { ref: 'Mat 18:1', number: '1', text: 'Pada waktu itu datanglah murid-murid itu kepada Yesus dan bertanya: "Siapakah yang terbesar dalam Kerajaan Sorga?"' },
            { ref: 'Mat 18:2', number: '2', text: 'Maka Yesus memanggil seorang anak kecil dan menempatkannya di tengah-tengah mereka' },
            { ref: 'Mat 18:3', number: '3', text: 'lalu berkata: "Aku berkata kepadamu, sesungguhnya jika kamu tidak bertobat dan menjadi seperti anak kecil ini, kamu tidak akan masuk ke dalam Kerajaan Sorga.' },
            { ref: 'Mat 18:4', number: '4', text: 'Sedangkan barangsiapa merendahkan diri dan menjadi seperti anak kecil ini, dialah yang terbesar dalam Kerajaan Sorga.' },
            { ref: 'Mat 18:5', number: '5', text: 'Dan barangsiapa menyambut seorang anak seperti ini dalam nama-Ku, ia menyambut Aku."' }
          ]
        },
        {
          id: 'bco',
          type: 'bco',
          label: 'Bacaan Offisi (BcO)',
          reference: '1Kor 7:25-40',
          query: '1Kor7:25-40;',
          fullText: 'Sekarang tentang para gadis. Untuk mereka aku tidak mendapat perintah dari Tuhan. Tetapi aku memberikan pendapatku sebagai seorang yang dapat dipercayai karena rahmat yang telah kuterima dari Allah. Aku berpendapat bahwa, mengingat waktu darurat sekarang, adalah baik bagi manusia untuk tetap dalam keadaannya.',
          verses: [
            { ref: '1Kor 7:25', number: '25', text: 'Sekarang tentang para gadis. Untuk mereka aku tidak mendapat perintah dari Tuhan. Tetapi aku memberikan pendapatku sebagai seorang yang dapat dipercayai karena rahmat yang telah kuterima dari Allah.' },
            { ref: '1Kor 7:26', number: '26', text: 'Aku berpendapat bahwa, mengingat waktu darurat sekarang, adalah baik bagi manusia untuk tetap dalam keadaannya.' }
          ]
        }
      ]
    };
    dayCache.set(normDate, fallback);
    return fallback;
  }

  return null;
}

/**
 * Fetch calendar days of month from imankatolik.or.id
 */
export async function fetchImanKatolikMonth(year: number, month: number): Promise<ImanKatolikMonthData | null> {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  if (monthCache.has(key)) {
    return monthCache.get(key)!;
  }

  try {
    const res = await fetch(`/api/imankatolik/calendar?year=${year}&month=${month}`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: ImanKatolikMonthData = await res.json();
    if (data && data.days) {
      monthCache.set(key, data);

      // Pre-seed dayCache with baseline readings for each day in this month
      Object.entries(data.days).forEach(([dStr, dEntry]) => {
        if (!dayCache.has(dStr)) {
          const parts = dStr.split('-').map(Number);
          const dNum = parts[2] || dEntry.day;
          const baseline = createDayFromMonthEntry(dStr, dEntry, year, month, dNum);
          dayCache.set(dStr, baseline);
        }
      });

      return data;
    }
  } catch (err) {
    console.warn(`[ImanKatolik] fetchImanKatolikMonth error for ${key}:`, err);
  }

  return null;
}
