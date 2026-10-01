import { getMonthLiturgicalDays } from './liturgy';

export interface CalApiCelebration {
  title: string;
  colour: string;
  rank: string;
  rank_num?: number;
}

export interface CalApiDay {
  date: string; // YYYY-MM-DD
  season: string; // ordinary, advent, christmas, lent, easter
  season_week?: number;
  celebrations: CalApiCelebration[];
  weekday?: string;
}

export const WARNA_LITURGI: Record<string, { id: string; hex: string; border: string }> = {
  white:  { id: 'Putih',      hex: '#FFFFFF', border: '#B8B2A4' },
  red:    { id: 'Merah',      hex: '#C0392B', border: '#C0392B' },
  green:  { id: 'Hijau',      hex: '#2E7D32', border: '#2E7D32' },
  violet: { id: 'Ungu',       hex: '#6A3D9A', border: '#6A3D9A' },
  purple: { id: 'Ungu',       hex: '#6A3D9A', border: '#6A3D9A' },
  rose:   { id: 'Merah Muda', hex: '#E58FB0', border: '#E58FB0' },
  gold:   { id: 'Emas',       hex: '#C9A227', border: '#C9A227' },
  black:  { id: 'Hitam',      hex: '#222222', border: '#222222' }
};

export const MASA_LITURGI: Record<string, string> = {
  ordinary: 'Masa Biasa',
  advent: 'Masa Adven',
  christmas: 'Masa Natal',
  lent: 'Masa Prapaskah',
  easter: 'Masa Paskah',
  paschal_triduum: 'Trihari Paskah'
};

export interface RankInfo {
  label: string;
  cls: string;
  bg: string;
  text: string;
}

export const RANK_LITURGI: Record<string, RankInfo> = {
  'solemnity':         { label: 'Sollemnitas',            cls: 'sollemnitas', bg: 'bg-[#C0392B]', text: 'text-white' },
  'sollemnitas':       { label: 'Sollemnitas',            cls: 'sollemnitas', bg: 'bg-[#C0392B]', text: 'text-white' },
  'triduum':           { label: 'Trihari Suci',           cls: 'sollemnitas', bg: 'bg-[#C0392B]', text: 'text-white' },
  'feast':             { label: 'Pesta',                  cls: 'festum',      bg: 'bg-[#E67E22]', text: 'text-white' },
  'sunday':            { label: 'Hari Minggu',            cls: 'festum',      bg: 'bg-[#E67E22]', text: 'text-white' },
  'memorial':          { label: 'Peringatan Wajib',       cls: 'memoria',     bg: 'bg-[#2980B9]', text: 'text-white' },
  'optional memorial': { label: 'Peringatan Fakultatif',  cls: 'memoria',     bg: 'bg-[#2980B9]', text: 'text-white' },
  'privileged ferial': { label: 'Ferial Istimewa',        cls: 'feria',       bg: 'bg-[#EDE8DF]', text: 'text-[#5D5343]' },
  'ferial':            { label: 'Ferial',                 cls: 'feria',       bg: 'bg-[#EDE8DF]', text: 'text-[#5D5343]' }
};

// URL web app Google Apps Script (proxy dari kode pengguna)
const PROXY_LITURGI_URL = 'https://script.google.com/macros/s/AKfycbzu8JjVt83IeQm4pOE5lxq4lwXRGCuWfgtjGyCkJrvi-EimvAwtQH2LfA2WlUtLvP5q2g/exec';
const API_LITURGI_HOST = 'calapi.inadiutorium.cz/api/v0/en/calendars/default/';

// Helper to get real current date in Indonesian timezone (WIB UTC+7)
export function getTodayDateParts(): { year: number; month: number; day: number; dateStr: string } {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.format(now);
    const [y, m, d] = parts.split('-').map(Number);
    return {
      year: y,
      month: m - 1, // 0-indexed month
      day: d,
      dateStr: parts
    };
  } catch {
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      year: y,
      month: m,
      day: d,
      dateStr: `${y}-${pad(m + 1)}-${pad(d)}`
    };
  }
}

export function litKey(year: number, monthIndex: number): string {
  return `${year}-${monthIndex + 1}`;
}

export function infoWarna(nama?: string) {
  const key = String(nama || '').toLowerCase();
  return WARNA_LITURGI[key] || { id: nama ? String(nama) : '', hex: '#7F8C8D', border: '#7F8C8D' };
}

export function infoRank(c: { rank?: string; rank_num?: number }): RankInfo {
  const kunci = String(c.rank || '').toLowerCase();
  if (RANK_LITURGI[kunci]) return RANK_LITURGI[kunci];
  const n = Number(c.rank_num);
  if (!isNaN(n)) {
    if (n < 2) return { label: 'Sollemnitas', cls: 'sollemnitas', bg: 'bg-[#C0392B]', text: 'text-white' };
    if (n < 3) return { label: 'Pesta', cls: 'festum', bg: 'bg-[#E67E22]', text: 'text-white' };
    if (n < 4) return { label: 'Peringatan Wajib', cls: 'memoria', bg: 'bg-[#2980B9]', text: 'text-white' };
  }
  return { label: c.rank ? String(c.rank) : 'Ferial', cls: 'feria', bg: 'bg-[#EDE8DF]', text: 'text-[#5D5343]' };
}

export function perayaanPenting(entri: CalApiDay): CalApiCelebration | null {
  if (!entri.celebrations || !entri.celebrations.length) return null;
  const match = entri.celebrations.find(c => {
    if (c.rank_num != null && Number(c.rank_num) < 3.12) return true;
    const r = String(c.rank || '').toLowerCase();
    return r === 'solemnity' || r === 'sollemnitas' || r === 'sollemnity' || r === 'feast' || r === 'memorial' || r === 'sunday';
  });
  return match || null;
}

function fetchWithTimeout(url: string, timeoutMs: number = 7000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { signal: ctrl.signal })
    .then(r => { clearTimeout(timer); return r; })
    .catch(e => { clearTimeout(timer); throw e; });
}

function jalurLiturgi() {
  const jalur: Array<{ nama: string; url: (path: string) => string }> = [];

  // 1. Same-origin server proxy (Express on port 3000) - NEVER blocked by Mixed Content or CORS
  if (typeof window !== 'undefined') {
    jalur.push({
      nama: 'server-proxy',
      url: (path) => `/api/liturgi?path=${encodeURIComponent(path)}`
    });
  }

  // 2. Direct CalApi (works in Node.js / dev server)
  jalur.push({
    nama: 'langsung-http',
    url: (path) => `http://${API_LITURGI_HOST}${path}`
  });

  // 3. User's Google Apps Script proxy
  if (PROXY_LITURGI_URL) {
    jalur.push({
      nama: 'proxy-sendiri',
      url: (path) => PROXY_LITURGI_URL + (PROXY_LITURGI_URL.indexOf('?') > -1 ? '&' : '?') + 'path=' + encodeURIComponent(path)
    });
  }

  return jalur;
}

function pertamaBerhasil<T>(daftar: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let gagal = 0;
    let lastErr: unknown;
    daftar.forEach(p => p.then(resolve, (e) => {
      lastErr = e;
      if (++gagal === daftar.length) reject(lastErr);
    }));
  });
}

async function ambilBulanLewatJalur(j: { nama: string; url: (path: string) => string }, path: string): Promise<CalApiDay[]> {
  const res = await fetchWithTimeout(j.url(path), 7000);
  if (!res.ok) throw new Error(j.nama + ' HTTP ' + res.status);
  const data = JSON.parse(await res.text());
  if (!Array.isArray(data) || !data.length || !data[0].date) throw new Error(j.nama + ': data bukan kalender bulanan');
  return data as CalApiDay[];
}

// Fallback jika offline atau API gagal: generate dari engine lokal
export function generateLocalFallbackMonth(year: number, monthIndex: number): Record<string, CalApiDay> {
  const localDays = getMonthLiturgicalDays(year, monthIndex);
  const map: Record<string, CalApiDay> = {};

  localDays.forEach(day => {
    let rankCode = 'ferial';
    let rankNum = 4.0;
    if (day.grade === 'sollemnity') {
      rankCode = 'solemnity';
      rankNum = 1.0;
    } else if (day.grade === 'feast') {
      rankCode = 'feast';
      rankNum = 2.0;
    } else if (day.grade === 'memorial') {
      rankCode = 'memorial';
      rankNum = 3.1;
    } else if (day.date.getDay() === 0) {
      rankCode = 'sunday';
      rankNum = 2.0;
    }

    const celebrations: CalApiCelebration[] = [
      {
        title: day.feastName || day.title,
        colour: day.color === 'purple' ? 'violet' : day.color,
        rank: rankCode,
        rank_num: rankNum
      }
    ];

    // Compute season week for Ordinary Time (Pekan ke-26 for late Sep / early Oct)
    let seasonWeek: number | undefined = undefined;
    if (day.season === 'Masa Biasa') {
      const dayOfYear = Math.floor((day.date.getTime() - new Date(year, 0, 1).getTime()) / (24 * 3600 * 1000));
      const approximateWeek = Math.floor(dayOfYear / 7) - 13;
      seasonWeek = Math.max(1, Math.min(34, approximateWeek));
    }

    map[day.dateStr] = {
      date: day.dateStr,
      season: day.season === 'Masa Biasa' ? 'ordinary' : day.season.toLowerCase(),
      season_week: seasonWeek,
      celebrations
    };
  });

  return map;
}

// Fetch liturgical data for a specific month
export async function ambilLiturgiBulan(year: number, monthIndex: number): Promise<Record<string, CalApiDay>> {
  const path = `${year}/${monthIndex + 1}`;
  try {
    const rawList = await pertamaBerhasil(jalurLiturgi().map(j => ambilBulanLewatJalur(j, path)));
    const peta: Record<string, CalApiDay> = {};
    rawList.forEach(item => {
      if (item && item.date && Array.isArray(item.celebrations)) {
        peta[item.date] = item;
      }
    });
    return peta;
  } catch (err) {
    console.warn(`[Liturgi] Gagal memuat dari remote untuk ${path}, menggunakan fallback lokal:`, err);
    return generateLocalFallbackMonth(year, monthIndex);
  }
}
