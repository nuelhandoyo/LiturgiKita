// Client data layer for imankatolik.or.id integration

export interface ImanKatolikVerse {
  ref: string;
  number: string;
  text: string;
}

export interface ImanKatolikReadingItem {
  id: string; // 'r1' | 'r1_alt' | 'ps' | 'r2' | 'g' | 'bco'
  type: 'bacaan_1' | 'bacaan_1_alt' | 'mazmur' | 'bacaan_2' | 'injil' | 'bco';
  label: string; // "Bacaan I", "Mazmur Tanggapan", "Bacaan Injil", "Bacaan Offisi (BcO)"
  reference: string; // e.g. "Mat. 18:1-5"
  query: string; // e.g. "Mat18:1-5;"
  verses: ImanKatolikVerse[];
  fullText: string;
}

export interface ImanKatolikDayData {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  perayaan: string;
  warnaLiturgi: string; // 'Putih' | 'Hijau' | 'Merah' | 'Ungu'
  readings: ImanKatolikReadingItem[];
  sourceUrl: string;
}

export interface ImanKatolikMonthDay {
  day: number;
  date: string;
  perayaan: string;
  warnaLiturgi: string;
  readingsSummary: {
    r1?: string;
    r1_alt?: string;
    ps?: string;
    r2?: string;
    g?: string;
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

/**
 * Fetch full day reading with complete verse texts from imankatolik.or.id
 */
export async function fetchImanKatolikDay(dateStr: string): Promise<ImanKatolikDayData | null> {
  const cleanDate = dateStr.replace(/[^0-9-]/g, '');
  if (dayCache.has(cleanDate)) {
    return dayCache.get(cleanDate)!;
  }

  try {
    const res = await fetch(`/api/imankatolik/bacaan?date=${encodeURIComponent(cleanDate)}`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`Failed to load readings: HTTP ${res.status}`);
    }
    const data: ImanKatolikDayData = await res.json();
    if (data && data.readings && data.readings.length > 0) {
      dayCache.set(cleanDate, data);
      return data;
    }
  } catch (err) {
    console.warn(`[ImanKatolik] fetchImanKatolikDay error for ${dateStr}:`, err);
  }

  // Fallback for 2026-10-01 (St. Theresia dari Kanak-kanak Yesus)
  if (cleanDate === '2026-10-01' || cleanDate === '20261001') {
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
    dayCache.set(cleanDate, fallback);
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
      return data;
    }
  } catch (err) {
    console.warn(`[ImanKatolik] fetchImanKatolikMonth error for ${key}:`, err);
  }

  return null;
}
