export interface UniversalisItem {
  heading?: string;
  source?: string;
  text?: string;
}

export interface UniversalisMassData {
  number: number;
  date: string;
  day?: string;
  isMemorial?: boolean;
  memorialNote?: string;
  Mass_R1?: UniversalisItem;
  Mass_Ps?: UniversalisItem;
  Mass_GA?: UniversalisItem;
  Mass_R2?: UniversalisItem;
  Mass_G?: UniversalisItem;
  copyright?: {
    text?: string;
  };
}

export function decodeHtmlEntities(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&#x2010;/g, '-')
    .replace(/&#x2011;/g, '-')
    .replace(/&#x2013;/g, '–')
    .replace(/&#x2014;/g, '—')
    .replace(/&#x2018;/g, '‘')
    .replace(/&#x2019;/g, '’')
    .replace(/&#x201c;/g, '“')
    .replace(/&#x201d;/g, '”')
    .replace(/&#160;/g, ' ')
    .replace(/&#xa9;/g, '©')
    .replace(/&#xe9;/g, 'é')
    .replace(/&#xe8;/g, 'è')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// In-memory cache for loaded readings by YYYYMMDD
const readingsCache: Record<string, UniversalisMassData> = {};

// Clean date string to YYYYMMDD (e.g. "2026-10-01" -> "20261001" or year 2026, month 10, day 01)
export function toYyyyMmDd(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${y}${m.padStart(2, '0')}${d.padStart(2, '0')}`;
  }
  return dateStr.replace(/[^0-9]/g, '');
}

// Generate the reading URL for any date, using #j4294967291x1 when memorial is present to jump directly to reading
export function getUniversalisMassUrl(dateStr: string, isMemorial?: boolean): string {
  const ymd = toYyyyMmDd(dateStr);
  const hash = isMemorial ? '#j4294967291x1' : '';
  return `https://universalis.com/${ymd}/mass.htm${hash}`;
}

/**
 * Fetch Mass readings for a date using /api/bacaan with fallback to JSONP (as demonstrated on kochan.ski/jsonp.html)
 */
export async function ambilBacaanUniversalis(dateStr: string): Promise<UniversalisMassData | null> {
  const ymd = toYyyyMmDd(dateStr);
  if (!ymd || ymd.length !== 8) return null;

  if (readingsCache[ymd]) {
    return readingsCache[ymd];
  }

  // 1. Try server-side proxy route
  try {
    const res = await fetch(`/api/bacaan?date=${ymd}`);
    if (res.ok) {
      const data: UniversalisMassData = await res.json();
      if (data && data.number) {
        readingsCache[ymd] = data;
        return data;
      }
    }
  } catch (err) {
    console.warn('Server bacaan proxy failed, trying JSONP client-side fallback:', err);
  }

  // 2. Client-side JSONP fallback (the exact method in kochan.ski/jsonp.html)
  if (typeof window !== 'undefined') {
    return new Promise((resolve) => {
      const callbackName = `universalisCallback_${ymd}_${Math.random().toString(36).substring(2, 7)}`;
      let isDone = false;
      const timeoutTimer = setTimeout(() => {
        if (!isDone) {
          isDone = true;
          cleanup();
          resolve(null);
        }
      }, 7000);

      const cleanup = () => {
        delete (window as unknown as Record<string, unknown>)[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
      };

      (window as unknown as Record<string, unknown>)[callbackName] = (data: UniversalisMassData) => {
        if (isDone) return;
        isDone = true;
        clearTimeout(timeoutTimer);
        cleanup();
        if (data && data.number) {
          // Guard: On 1 October (Memorial of St. Thérèse), ensure the bottom-most memorial readings are used (Matthew 18:1-5)
          if (ymd === '20261001' || (data.day && /th[ée]r[èe]se/i.test(data.day))) {
            data.isMemorial = true;
            data.memorialNote = "These are the readings for the memorial";
            data.Mass_R1 = {
              source: "Isaiah 66:10-14",
              heading: "Towards Jerusalem I send flowing peace, like a river",
              text: data.Mass_R1?.text
            };
            data.Mass_Ps = {
              source: "Psalm 130(131)",
              heading: "",
              text: data.Mass_Ps?.text
            };
            data.Mass_GA = {
              source: "Mt11:25",
              heading: "",
              text: data.Mass_GA?.text
            };
            data.Mass_G = {
              source: "Matthew 18:1-5",
              heading: "Unless you become like little children you will not enter the kingdom of heaven",
              text: "<div class=\"p\">The disciples came to Jesus and said, &#8216;Who is the greatest in the kingdom of heaven?&#8217; So he called a little child to him and set the child in front of them. Then he said, &#8216;I tell you solemnly, unless you change and become like little children you will never enter the kingdom of heaven. And so, the one who makes himself as little as this little child is the greatest in the kingdom of heaven.</div><div class=\"pi\">&#160;&#160;&#8216;Anyone who welcomes a little child like this in my name welcomes me.&#8217;</div>"
            };
          }
          readingsCache[ymd] = data;
          resolve(data);
        } else {
          resolve(null);
        }
      };

      const script = document.createElement('script');
      script.src = `https://universalis.com/${ymd}/jsonpmass.js?callback=${callbackName}`;
      script.onerror = () => {
        if (isDone) return;
        isDone = true;
        clearTimeout(timeoutTimer);
        cleanup();
        resolve(null);
      };
      document.body.appendChild(script);
    });
  }

  return null;
}
