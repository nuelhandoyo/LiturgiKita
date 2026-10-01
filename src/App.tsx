import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ambilLiturgiBulan, 
  litKey, 
  infoWarna, 
  infoRank, 
  perayaanPenting, 
  CalApiDay, 
  CalApiCelebration,
  MASA_LITURGI,
  generateLocalFallbackMonth,
  getTodayDateParts
} from './data/calapi';
import { getLiturgicalDay } from './data/liturgy';
import { 
  ambilBacaanUniversalis, 
  decodeHtmlEntities, 
  UniversalisMassData,
  getUniversalisMassUrl,
  toYyyyMmDd
} from './data/universalis';
import {
  fetchImanKatolikDay,
  fetchImanKatolikMonth,
  ImanKatolikDayData,
  ImanKatolikMonthData
} from './data/imankatolik';
import QuoteCard from './components/QuoteCard';
import ReadingsModal from './components/ReadingsModal';
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  Calendar as CalendarIcon,
  BookOpen,
  Scroll,
  Cross,
  Sparkles,
  Info,
  ExternalLink,
  Globe,
  Bookmark,
  Flame,
  Church
} from 'lucide-react';

const NAMA_BULAN_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const HARI_SINGKAT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const HARI_LENGKAP = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export default function App() {
  // Always initialize dynamically to current real-time date (aligned with user's local timezone)
  const todayInfo = useMemo(() => getTodayDateParts(), []);
  const todayStr = todayInfo.dateStr;

  const [currentYear, setCurrentYear] = useState<number>(todayInfo.year);
  const [currentMonth, setCurrentMonth] = useState<number>(todayInfo.month); // 0-11
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayInfo.dateStr);

  // Liturgical data cache and loading state
  const [litCache, setLitCache] = useState<Record<string, Record<string, CalApiDay>>>(() => {
    // Seed current month with local calculation immediately for zero-delay initial render
    const initialKey = litKey(todayInfo.year, todayInfo.month);
    return {
      [initialKey]: generateLocalFallbackMonth(todayInfo.year, todayInfo.month)
    };
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Iman Katolik readings state (imankatolik.or.id)
  const [imanKatolikData, setImanKatolikData] = useState<ImanKatolikDayData | null>(null);
  const [imanKatolikMonth, setImanKatolikMonth] = useState<ImanKatolikMonthData | null>(null);
  const [isLoadingImanKatolik, setIsLoadingImanKatolik] = useState<boolean>(false);

  // Universalis readings state (from kochan.ski/jsonp.html source)
  const [universalisData, setUniversalisData] = useState<UniversalisMassData | null>(null);
  const [isLoadingReadings, setIsLoadingReadings] = useState<boolean>(false);
  const [isReadingsModalOpen, setIsReadingsModalOpen] = useState<boolean>(false);
  const [modalInitialTab, setModalInitialTab] = useState<string>('all');

  const openReadingsModal = (tab: string = 'all') => {
    setModalInitialTab(tab);
    setIsReadingsModalOpen(true);
  };

  // Network status listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch liturgical calendar whenever month or year changes
  useEffect(() => {
    const key = litKey(currentYear, currentMonth);
    let isCancelled = false;

    setIsLoading(true);
    ambilLiturgiBulan(currentYear, currentMonth)
      .then((data) => {
        if (!isCancelled && data && Object.keys(data).length > 0) {
          setLitCache((prev) => ({
            ...prev,
            [key]: data
          }));
        }
      })
      .catch((err) => {
        console.warn('Liturgi fetch error:', err);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    // Also fetch month calendar from imankatolik.or.id
    fetchImanKatolikMonth(currentYear, currentMonth + 1)
      .then((data) => {
        if (!isCancelled && data) {
          setImanKatolikMonth(data);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [currentYear, currentMonth]);

  // Fetch complete day readings from imankatolik.or.id whenever selectedDateStr changes
  useEffect(() => {
    if (!selectedDateStr) return;
    let isCancelled = false;

    // Immediately clear previous day data so stale data is never shown
    setImanKatolikData(null);
    setIsLoadingImanKatolik(true);
    setIsLoadingReadings(true);

    fetchImanKatolikDay(selectedDateStr)
      .then((data) => {
        if (!isCancelled && data && data.date === selectedDateStr) {
          setImanKatolikData(data);
        }
      })
      .catch((err) => {
        console.warn('Iman Katolik reading fetch error:', err);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingImanKatolik(false);
        }
      });

    // Background fetch for Universalis as auxiliary
    ambilBacaanUniversalis(selectedDateStr)
      .then((data) => {
        if (!isCancelled) {
          setUniversalisData(data);
        }
      })
      .catch((err) => {
        console.warn('Universalis readings fetch error:', err);
        if (!isCancelled) setUniversalisData(null);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingReadings(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedDateStr]);

  // Current active month's liturgical data map
  const activeMonthMap = useMemo(() => {
    const key = litKey(currentYear, currentMonth);
    return litCache[key] || generateLocalFallbackMonth(currentYear, currentMonth);
  }, [litCache, currentYear, currentMonth]);

  // Active selected day's liturgical entry (from CalApi)
  const selectedDayEntry = useMemo(() => {
    if (!selectedDateStr) return null;
    return activeMonthMap[selectedDateStr] || null;
  }, [selectedDateStr, activeMonthMap]);

  // Supplementary details (readings, psalm, reflection) from liturgical calculator
  const selectedLocalDay = useMemo(() => {
    if (!selectedDateStr) return null;
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    try {
      return getLiturgicalDay(new Date(y, m - 1, d));
    } catch {
      return null;
    }
  }, [selectedDateStr]);

  // Primary celebration calculation for selected date
  const celebrationDetails = useMemo(() => {
    const celebrations = selectedDayEntry?.celebrations || [];
    const primary = celebrations[0];

    // Priority: Iman Katolik Indonesian feast name > remote CalApi title > local day title
    const imkDay = (imanKatolikData && imanKatolikData.date === selectedDateStr) 
      ? imanKatolikData 
      : (selectedDateStr ? imanKatolikMonth?.days?.[selectedDateStr] : null);
    const rawTitle = imkDay?.perayaan || primary?.title || selectedLocalDay?.feastName || selectedLocalDay?.title || 'Ferial';
    const title = rawTitle.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Rank info
    const rank = primary ? infoRank(primary) : {
      label: selectedLocalDay?.gradeLabel || 'Ferial',
      cls: selectedLocalDay?.grade || 'ferial',
      bg: 'bg-[#EDE8DF]',
      text: 'text-[#5D5343]'
    };

    // Liturgical color from Iman Katolik or calendar
    let color = infoWarna(primary?.colour || selectedLocalDay?.color || 'white');
    if (imkDay?.warnaLiturgi) {
      const w = imkDay.warnaLiturgi.toLowerCase();
      if (w.includes('putih')) color = infoWarna('white');
      else if (w.includes('merah muda')) color = infoWarna('rose');
      else if (w.includes('merah')) color = infoWarna('red');
      else if (w.includes('ungu')) color = infoWarna('violet');
      else if (w.includes('hijau')) color = infoWarna('green');
    }

    // Season and week
    const rawSeason = String(selectedDayEntry?.season || selectedLocalDay?.season || 'ordinary').toLowerCase();
    const seasonName = MASA_LITURGI[rawSeason] || selectedDayEntry?.season || selectedLocalDay?.season || 'Masa Biasa';
    const seasonWeek = selectedDayEntry?.season_week != null 
      ? ` · Pekan ke-${selectedDayEntry.season_week}` 
      : '';

    return {
      title,
      rank,
      color,
      seasonText: `${seasonName}${seasonWeek}`,
      otherCelebrations: celebrations.slice(1)
    };
  }, [selectedDayEntry, selectedLocalDay, imanKatolikData, imanKatolikMonth, selectedDateStr]);

  // Unified readings info with priority on Iman Katolik (imankatolik.or.id)
  const readingsSummary = useMemo(() => {
    const activeImkDay = (imanKatolikData && imanKatolikData.date === selectedDateStr)
      ? imanKatolikData
      : null;
    const monthDay = selectedDateStr ? imanKatolikMonth?.days?.[selectedDateStr] : null;

    // 1. Full data with verses from Iman Katolik
    if (activeImkDay && activeImkDay.readings && activeImkDay.readings.length > 0) {
      const r1 = activeImkDay.readings.find(r => r.type === 'bacaan_1');
      const r1Alt = activeImkDay.readings.find(r => r.type === 'bacaan_1_alt');
      const ps = activeImkDay.readings.find(r => r.type === 'mazmur');
      const r2 = activeImkDay.readings.find(r => r.type === 'bacaan_2');
      const r2Alt = activeImkDay.readings.find(r => r.type === 'bacaan_2_alt');
      const g = activeImkDay.readings.find(r => r.type === 'injil');
      const gAlt = activeImkDay.readings.find(r => r.type === 'injil_alt');
      const bco = activeImkDay.readings.find(r => r.type === 'bco');

      return {
        sourceType: 'imankatolik',
        r1Source: r1?.reference || '',
        r1AltSource: r1Alt?.reference || '',
        psSource: ps?.reference || '',
        r2Source: r2?.reference || '',
        r2AltSource: r2Alt?.reference || '',
        gSource: g?.reference || '',
        gAltSource: gAlt?.reference || '',
        bcoSource: bco?.reference || '',
        r1Heading: '',
        r2Heading: '',
        gHeading: '',
        hasFullText: activeImkDay.readings.some(r => r.verses && r.verses.length > 0),
        perayaan: activeImkDay.perayaan,
        warnaLiturgi: activeImkDay.warnaLiturgi
      };
    }

    // 2. Immediate Month-level summary from Iman Katolik for ANY day of the month
    if (monthDay && (monthDay.readingsSummary?.r1 || monthDay.readingsSummary?.g || (monthDay.readings && monthDay.readings.length > 0))) {
      const r1 = monthDay.readingsSummary?.r1 || monthDay.readings?.find((r: any) => r.type === 'bacaan_1')?.reference || '';
      const r1Alt = monthDay.readingsSummary?.r1_alt || monthDay.readings?.find((r: any) => r.type === 'bacaan_1_alt')?.reference || '';
      const ps = monthDay.readingsSummary?.ps || monthDay.readings?.find((r: any) => r.type === 'mazmur')?.reference || '';
      const r2 = monthDay.readingsSummary?.r2 || monthDay.readings?.find((r: any) => r.type === 'bacaan_2')?.reference || '';
      const r2Alt = monthDay.readingsSummary?.r2_alt || monthDay.readings?.find((r: any) => r.type === 'bacaan_2_alt')?.reference || '';
      const g = monthDay.readingsSummary?.g || monthDay.readings?.find((r: any) => r.type === 'injil')?.reference || '';
      const gAlt = monthDay.readingsSummary?.g_alt || monthDay.readings?.find((r: any) => r.type === 'injil_alt')?.reference || '';
      const bco = monthDay.readingsSummary?.bco || monthDay.readings?.find((r: any) => r.type === 'bco')?.reference || '';

      return {
        sourceType: 'imankatolik_summary',
        r1Source: r1,
        r1AltSource: r1Alt,
        psSource: ps,
        r2Source: r2,
        r2AltSource: r2Alt,
        gSource: g,
        gAltSource: gAlt,
        bcoSource: bco,
        r1Heading: '',
        r2Heading: '',
        gHeading: '',
        hasFullText: false,
        perayaan: monthDay.perayaan,
        warnaLiturgi: monthDay.warnaLiturgi
      };
    }

    // 3. Auxiliary Universalis readings
    if (universalisData) {
      const r1Source = decodeHtmlEntities(universalisData.Mass_R1?.source) || selectedLocalDay?.readings?.firstReading || '';
      const r1Heading = decodeHtmlEntities(universalisData.Mass_R1?.heading) || '';
      const psSource = decodeHtmlEntities(universalisData.Mass_Ps?.source) || selectedLocalDay?.readings?.psalm || '';
      const r2Source = decodeHtmlEntities(universalisData.Mass_R2?.source) || selectedLocalDay?.readings?.secondReading || '';
      const r2Heading = decodeHtmlEntities(universalisData.Mass_R2?.heading) || '';
      const gSource = decodeHtmlEntities(universalisData.Mass_G?.source) || selectedLocalDay?.readings?.gospel || '';
      const gHeading = decodeHtmlEntities(universalisData.Mass_G?.heading) || '';

      return {
        sourceType: 'universalis',
        r1Source,
        r1AltSource: '',
        r1Heading,
        psSource,
        r2Source,
        r2Heading,
        gSource,
        gHeading,
        bcoSource: '',
        hasFullText: Boolean(universalisData.Mass_R1?.text || universalisData.Mass_G?.text),
        perayaan: '',
        warnaLiturgi: ''
      };
    }

    if (selectedLocalDay?.readings) {
      return {
        sourceType: 'local',
        r1Source: selectedLocalDay.readings.firstReading,
        r1AltSource: '',
        r1Heading: '',
        psSource: selectedLocalDay.readings.psalm,
        r2Source: selectedLocalDay.readings.secondReading || '',
        r2Heading: '',
        gSource: selectedLocalDay.readings.gospel,
        gHeading: '',
        bcoSource: '',
        hasFullText: false,
        perayaan: '',
        warnaLiturgi: ''
      };
    }

    return null;
  }, [imanKatolikData, imanKatolikMonth, universalisData, selectedLocalDay, selectedDateStr]);

  // Navigation handlers
  const handlePrevMonth = () => {
    let nextY = currentYear;
    let nextM = currentMonth;
    if (currentMonth === 0) {
      nextM = 11;
      nextY = currentYear - 1;
    } else {
      nextM = currentMonth - 1;
    }
    setCurrentMonth(nextM);
    setCurrentYear(nextY);

    if (nextY === todayInfo.year && nextM === todayInfo.month) {
      setSelectedDateStr(todayInfo.dateStr);
    } else {
      setSelectedDateStr(`${nextY}-${String(nextM + 1).padStart(2, '0')}-01`);
    }
  };

  const handleNextMonth = () => {
    let nextY = currentYear;
    let nextM = currentMonth;
    if (currentMonth === 11) {
      nextM = 0;
      nextY = currentYear + 1;
    } else {
      nextM = currentMonth + 1;
    }
    setCurrentMonth(nextM);
    setCurrentYear(nextY);

    if (nextY === todayInfo.year && nextM === todayInfo.month) {
      setSelectedDateStr(todayInfo.dateStr);
    } else {
      setSelectedDateStr(`${nextY}-${String(nextM + 1).padStart(2, '0')}-01`);
    }
  };

  const handleGoToToday = () => {
    const currentNow = getTodayDateParts();
    setCurrentYear(currentNow.year);
    setCurrentMonth(currentNow.month);
    setSelectedDateStr(currentNow.dateStr);
  };

  const handleSelectDay = (dateStr: string) => {
    setSelectedDateStr(dateStr);
  };

  const handlePrevDay = () => {
    if (!selectedDateStr) return;
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 1);
    const newY = dt.getFullYear();
    const newM = dt.getMonth();
    const newStr = `${newY}-${String(newM + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    if (newY !== currentYear || newM !== currentMonth) {
      setCurrentYear(newY);
      setCurrentMonth(newM);
    }
    setSelectedDateStr(newStr);
  };

  const handleNextDay = () => {
    if (!selectedDateStr) return;
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + 1);
    const newY = dt.getFullYear();
    const newM = dt.getMonth();
    const newStr = `${newY}-${String(newM + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    if (newY !== currentYear || newM !== currentMonth) {
      setCurrentYear(newY);
      setCurrentMonth(newM);
    }
    setSelectedDateStr(newStr);
  };

  // Calendar grid calculations (Monday-first: Sen = 0 ... Min = 6)
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();

  let startDayIndex = firstDay.getDay() - 1;
  if (startDayIndex === -1) startDayIndex = 6;

  const totalGridCells = Math.ceil((startDayIndex + daysInMonth) / 7) * 7;
  const endPadCount = totalGridCells - (startDayIndex + daysInMonth);

  // Month unique liturgical colors for the legend
  const monthColors = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ id: string; hex: string; border: string }> = [];

    Object.keys(activeMonthMap).sort().forEach((dateKey) => {
      const day = activeMonthMap[dateKey];
      if (day && day.celebrations && day.celebrations.length > 0) {
        day.celebrations.forEach((c) => {
          const colKey = String(c.colour || '').toLowerCase();
          if (colKey && !seen.has(colKey)) {
            seen.add(colKey);
            list.push(infoWarna(colKey));
          }
        });
      }
    });

    if (list.length === 0) {
      list.push(infoWarna('green'), infoWarna('white'), infoWarna('red'), infoWarna('violet'));
    }
    return list;
  }, [activeMonthMap]);

  // Important celebrations of the month for "Perayaan Bulan Ini"
  const perayaanBulanIni = useMemo(() => {
    const rows: Array<{
      dateStr: string;
      dayNum: number;
      celebration: CalApiCelebration;
    }> = [];

    Object.keys(activeMonthMap).sort().forEach((dateKey) => {
      const entri = activeMonthMap[dateKey];
      if (!entri) return;
      const c = perayaanPenting(entri);
      if (c) {
        const dayNum = parseInt(dateKey.slice(8), 10);
        rows.push({
          dateStr: dateKey,
          dayNum,
          celebration: c
        });
      }
    });

    return rows;
  }, [activeMonthMap]);

  // Formatted date string for selected date
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDateStr) return '';
    const [yy, mm, dd] = selectedDateStr.split('-').map(Number);
    return new Date(yy, mm - 1, dd).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [selectedDateStr]);

  const isSelectedDateToday = selectedDateStr === todayStr;

  return (
    <div className="min-h-screen bg-[#F5F2EC] text-[#1C2B3A] font-sans flex flex-col">
      {/* Top App Header - Responsive on mobile without clipping or overflow */}
      <header className="min-h-16 py-2.5 sm:py-0 border-b border-[#E8E2D6] bg-white/95 backdrop-blur-md sticky top-0 z-30 flex items-center shrink-0">
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 flex items-center justify-between gap-2">
          {/* App Title & Brand */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-xl sm:text-2xl filter drop-shadow-xs select-none shrink-0">🕊️</span>
            <div className="min-w-0">
              <h1 className="font-serif text-base sm:text-lg md:text-xl font-bold tracking-tight text-[#1C2B3A] leading-tight truncate">
                Kalender Liturgi Katolik
              </h1>
              <p className="font-mono text-[9px] sm:text-[10px] font-semibold tracking-wider text-[#A8833A] uppercase truncate">
                Tahun Liturgi Gereja
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {isLoading && (
              <span className="text-[11px] font-mono font-medium text-[#A8833A] animate-pulse hidden md:inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#A8833A] animate-ping" />
                Sinkronisasi...
              </span>
            )}
            
            <button
              type="button"
              onClick={handleGoToToday}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold text-[#1C2B3A] bg-[#F5F2EC] hover:bg-[#1C2B3A] hover:text-white transition-all cursor-pointer border border-[#E8E2D6]"
              title="Lihat Liturgi Hari Ini"
            >
              <RotateCcw className="h-3 w-3 shrink-0" />
              <span>Hari Ini</span>
            </button>

            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#F5F2EC] border border-[#E8E2D6]">
              {isOnline ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                  <span className="text-emerald-800 hidden xs:inline">Online</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-rose-600 shrink-0" />
                  <span className="text-rose-700 hidden xs:inline">Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8 flex flex-col space-y-6">
        
        {/* ========================================================================= */}
        {/* 1. TOP HERO CARD: CARD LITURGI HARIAN (Changes when calendar day clicked) */}
        {/* ========================================================================= */}
        <section aria-label="Card Liturgi Harian" className="w-full">
          <div className="bg-white border-2 border-[#E3C177]/80 rounded-[28px] shadow-[0_16px_36px_rgba(28,43,58,0.06)] overflow-hidden transition-all duration-300 relative">
            
            {/* Liturgical color accent top bar */}
            <div 
              className="h-2 w-full transition-colors duration-500" 
              style={{ backgroundColor: celebrationDetails.color.hex }}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDateStr}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="p-5 sm:p-7 lg:p-8"
              >
                {/* Top status bar inside card */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E8E2D6]/80">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-widest uppercase bg-[#F5F2EC] text-[#1C5799] border border-[#E8E2D6]">
                      <Sparkles className="w-3 h-3 text-[#A8833A]" />
                      Liturgi Harian
                    </span>

                    {isSelectedDateToday ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-[#FBF4E4] text-[#A8833A] border border-[#C4B89A]/50 shadow-xs animate-pulse">
                        ● HARI INI
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGoToToday}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-[#1C5799] hover:bg-[#1C5799] hover:text-white transition-all cursor-pointer border border-[#1C5799]/30"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Kembali ke Hari Ini
                      </button>
                    )}
                  </div>

                  {/* Day step buttons */}
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#8A8378] hidden sm:inline">
                      Navigasi Hari:
                    </span>
                    <button
                      type="button"
                      onClick={handlePrevDay}
                      aria-label="Hari sebelumnya"
                      className="p-1.5 rounded-full bg-[#F5F2EC] text-[#1C2B3A] hover:bg-[#1C2B3A] hover:text-white transition-colors cursor-pointer"
                      title="Hari Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextDay}
                      aria-label="Hari berikutnya"
                      className="p-1.5 rounded-full bg-[#F5F2EC] text-[#1C2B3A] hover:bg-[#1C2B3A] hover:text-white transition-colors cursor-pointer"
                      title="Hari Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Main Liturgical Celebration Details */}
                <div className="mt-5 space-y-4">
                  {/* Full Indonesian Date */}
                  <p className="font-mono text-xs sm:text-sm font-semibold tracking-wide text-[#A8833A] uppercase">
                    {formattedSelectedDate}
                  </p>

                  {/* Title and Rank Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-2.5 sm:gap-4">
                    <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1C2B3A] tracking-tight leading-snug">
                      {celebrationDetails.title}
                    </h2>
                    
                    <span 
                      className={`inline-block self-start sm:self-auto text-xs font-sans font-bold uppercase tracking-wider px-3 py-1 rounded-full shrink-0 shadow-3xs ${celebrationDetails.rank.bg} ${celebrationDetails.rank.text}`}
                    >
                      {celebrationDetails.rank.label}
                    </span>
                  </div>

                  {/* Metadata tags: Masa Liturgi & Warna Liturgi */}
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-1 text-sm font-medium text-[#1C2B3A]">
                    {/* Season */}
                    <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#F5F2EC] border border-[#E8E2D6]">
                      <span className="font-mono text-xs text-[#8A8378] uppercase">Masa:</span>
                      <span className="font-bold text-[#1C2B3A]">
                        {celebrationDetails.seasonText}
                      </span>
                    </div>

                    {/* Liturgical Color */}
                    <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#F5F2EC] border border-[#E8E2D6]">
                      <span className="font-mono text-xs text-[#8A8378] uppercase">Warna liturgi:</span>
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-3 h-3 rounded-full border border-black/15 shadow-3xs" 
                          style={{ backgroundColor: celebrationDetails.color.hex }}
                        />
                        <span className="font-bold text-[#1C2B3A]">
                          {celebrationDetails.color.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Secondary celebrations if any (e.g. optional memorials) */}
                  {celebrationDetails.otherCelebrations.length > 0 && (
                    <div className="pt-2">
                      <span className="font-mono text-[11px] text-[#8A8378] uppercase mr-2">Peringatan Fakultatif:</span>
                      <div className="inline-flex flex-wrap gap-2 mt-1">
                        {celebrationDetails.otherCelebrations.map((c, i) => (
                          <span key={i} className="text-xs bg-[#F5F2EC] text-[#1C2B3A] px-2.5 py-0.5 rounded-lg border border-[#E8E2D6]">
                            {c.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ========================================================= */}
                  {/* BACAAN LITURGI DARI IMAN KATOLIK (imankatolik.or.id) */}
                  {/* ========================================================= */}
                  <div className="mt-6 pt-5 border-t border-dashed border-[#DDD8CE] space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold tracking-widest text-[#8A8378] uppercase">
                          Liturgi Sabda Hari Ini
                        </span>
                        {isLoadingImanKatolik ? (
                          <span className="text-[10px] font-mono text-[#7A2E39] animate-pulse">
                            (Memuat bacaan...)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#FBF4E4] text-[#7A2E39] border border-[#E8D8B8]">
                            imankatolik.or.id
                          </span>
                        )}
                      </div>

                      {/* Buttons to open Full Text Reader Modal and Original Calendar */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openReadingsModal('all')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#7A2E39] hover:bg-[#60222B] text-white transition-all text-xs font-semibold shadow-xs cursor-pointer"
                          title="Tampilkan popup naskah bacaan lengkap"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-[#FAD02C]" />
                          <span>Baca Teks Lengkap (Popup)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openReadingsModal('imankatolik_web')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F5F2EC] hover:bg-[#1C2B3A] hover:text-white text-[#5D5343] transition-all text-xs font-semibold border border-[#E8E2D6] cursor-pointer"
                          title="Buka tampilan kalender resmi imankatolik.or.id"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Kalender Asli</span>
                        </button>
                      </div>
                    </div>

                    {/* Readings Summary Badges Grid */}
                    {readingsSummary && (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {/* Bacaan I */}
                          <div 
                            onClick={() => openReadingsModal('r1')}
                            className="p-3 rounded-xl bg-[#F5F2EC]/80 border border-[#E8E2D6] transition-all cursor-pointer hover:bg-[#F5F2EC] hover:border-[#7A2E39]/40 hover:shadow-xs"
                            title="Klik untuk membuka teks bacaan lengkap"
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4 text-[#7A2E39] shrink-0" />
                                <span className="text-[10px] font-mono text-[#8A8378] uppercase font-bold">Bacaan I</span>
                              </div>
                              <span className="text-[9px] font-mono text-[#7A2E39] bg-[#FBF4E4] px-1.5 py-0.2 rounded font-semibold">
                                Buka Teks &rarr;
                              </span>
                            </div>
                            <span className="font-semibold text-xs sm:text-sm text-[#1C2B3A] block truncate" title={readingsSummary.r1Source}>
                              {readingsSummary.r1Source || 'Belum tersedia'}
                            </span>
                            {readingsSummary.r1AltSource && (
                              <p className="text-[10px] text-[#8A8378] mt-0.5 truncate" title={`Pilihan lain: ${readingsSummary.r1AltSource}`}>
                                atau {readingsSummary.r1AltSource}
                              </p>
                            )}
                          </div>

                          {/* Mazmur Tanggapan */}
                          <div 
                            onClick={() => openReadingsModal('ps')}
                            className="p-3 rounded-xl bg-[#F5F2EC]/80 border border-[#E8E2D6] transition-all cursor-pointer hover:bg-[#F5F2EC] hover:border-blue-400/40 hover:shadow-xs"
                            title="Klik untuk membuka teks mazmur lengkap"
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1.5">
                                <Scroll className="w-4 h-4 text-blue-600 shrink-0" />
                                <span className="text-[10px] font-mono text-[#8A8378] uppercase font-bold">Mazmur Tanggapan</span>
                              </div>
                              <span className="text-[9px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-semibold">
                                Buka Teks &rarr;
                              </span>
                            </div>
                            <span className="font-semibold text-xs sm:text-sm text-[#1C2B3A] block truncate" title={readingsSummary.psSource}>
                              {readingsSummary.psSource || 'Belum tersedia'}
                            </span>
                          </div>

                          {/* Bacaan Injil */}
                          <div 
                            onClick={() => openReadingsModal('g')}
                            className="p-3 rounded-xl bg-amber-50/60 border-2 border-amber-300 transition-all cursor-pointer hover:bg-amber-100/70 hover:border-amber-400 hover:shadow-xs"
                            title="Klik untuk membuka teks injil lengkap"
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                                <span className="text-[10px] font-mono text-amber-900 uppercase font-bold">Bacaan Injil</span>
                              </div>
                              <span className="text-[9px] font-mono text-amber-800 bg-amber-200/60 px-1.5 py-0.2 rounded font-semibold">
                                Buka Teks &rarr;
                              </span>
                            </div>
                            <span className="font-bold text-xs sm:text-sm text-[#1C2B3A] block truncate" title={readingsSummary.gSource}>
                              {readingsSummary.gSource || 'Belum tersedia'}
                            </span>
                            {readingsSummary.gAltSource && (
                              <p className="text-[10px] text-amber-800 mt-0.5 truncate" title={`Pilihan: ${readingsSummary.gAltSource}`}>
                                atau {readingsSummary.gAltSource}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Optional Second Reading & BcO row */}
                        {(readingsSummary.r2Source || readingsSummary.bcoSource) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {readingsSummary.r2Source && (
                              <div 
                                onClick={() => openReadingsModal('r2')}
                                className="p-2.5 rounded-xl bg-[#F5F2EC]/60 border border-[#E8E2D6] flex items-center justify-between text-xs cursor-pointer hover:bg-[#F5F2EC] transition-all"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <BookOpen className="w-3.5 h-3.5 text-[#7A2E39] shrink-0" />
                                  <span className="font-mono text-[10px] font-bold text-[#8A8378] uppercase shrink-0">Bacaan II:</span>
                                  <span className="font-semibold text-[#1C2B3A] truncate">{readingsSummary.r2Source}</span>
                                  {readingsSummary.r2AltSource && (
                                    <span className="text-[10px] text-[#8A8378] truncate">/ {readingsSummary.r2AltSource}</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-[#7A2E39] font-medium hover:underline shrink-0 ml-2">
                                  Teks &rarr;
                                </span>
                              </div>
                            )}

                            {readingsSummary.bcoSource && (
                              <div 
                                onClick={() => openReadingsModal('bco')}
                                className="p-2.5 rounded-xl bg-purple-50/40 border border-purple-200/60 flex items-center justify-between text-xs cursor-pointer hover:bg-purple-50 transition-all"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <Bookmark className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                  <span className="font-mono text-[10px] font-bold text-purple-800 uppercase shrink-0">Ibadat Bacaan (BcO):</span>
                                  <span className="font-semibold text-[#1C2B3A] truncate">{readingsSummary.bcoSource}</span>
                                </div>
                                <span className="text-[10px] text-purple-700 font-medium hover:underline shrink-0 ml-2">
                                  Teks &rarr;
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reflection if available from local liturgical data */}
                    {selectedLocalDay?.readings?.reflection && (
                      <div className="p-4 rounded-2xl bg-[#FBF8F2] border border-[#E8E2D6] text-xs sm:text-sm text-[#5D5343] italic leading-relaxed flex items-start gap-3">
                        <span className="text-xl text-[#A8833A] select-none leading-none mt-0.5">“</span>
                        <p className="flex-1">
                          {selectedLocalDay.readings.reflection}
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            </AnimatePresence>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. CALENDAR & OVERVIEW SECTION (Right below the Liturgical Card) */}
        {/* ========================================================================= */}
        <section aria-label="Kalender dan Perayaan" className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* LEFT: Calendar Widget (Grid of Days) */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              <div className="bg-white border border-[#E8E2D6] rounded-[24px] p-5 sm:p-7 shadow-[0_12px_24px_rgba(28,43,58,0.04)]">
                
                {/* Calendar Header with Month/Year & Navigation Controls */}
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#E8E2D6]/70">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#F5F2EC] text-[#1C5799]">
                      <CalendarIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1C2B3A] leading-tight">
                        {NAMA_BULAN_FULL[currentMonth]} {currentYear}
                      </h3>
                      <p className="font-mono text-[10px] font-semibold text-[#8A8378] tracking-widest uppercase">
                        Klik tanggal untuk mengubah kartu liturgi di atas
                      </p>
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGoToToday}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#1C2B3A] bg-[#F5F2EC] hover:bg-[#1C2B3A] hover:text-white transition-all cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Hari Ini
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        aria-label="Bulan sebelumnya"
                        className="w-9 h-9 rounded-full bg-[#F5F2EC] text-[#1C5799] hover:bg-[#1C2B3A] hover:text-white flex items-center justify-center transition-all cursor-pointer font-bold text-lg"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        aria-label="Bulan berikutnya"
                        className="w-9 h-9 rounded-full bg-[#F5F2EC] text-[#1C5799] hover:bg-[#1C2B3A] hover:text-white flex items-center justify-center transition-all cursor-pointer font-bold text-lg"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Weekday Names Header (Senin - Minggu) */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-3">
                  {HARI_SINGKAT.map((h, idx) => (
                    <div 
                      key={h} 
                      className={`font-mono text-[11px] font-bold uppercase tracking-wider py-1 select-none ${
                        idx === 6 ? 'text-[#C0392B]' : 'text-[#8A8378]'
                      }`}
                    >
                      <span className="hidden sm:inline">{HARI_LENGKAP[idx]}</span>
                      <span className="sm:hidden">{h}</span>
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {/* Empty cells before month start */}
                  {Array.from({ length: startDayIndex }).map((_, i) => (
                    <div key={`empty-start-${i}`} className="aspect-square rounded-xl" />
                  ))}

                  {/* Day cells */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    
                    const isToday = (dateStr === todayStr);
                    const isActive = (selectedDateStr === dateStr);

                    const imkDay = imanKatolikMonth?.days?.[dateStr];
                    const litEntri = activeMonthMap[dateStr];
                    const celebrations = litEntri?.celebrations || [];
                    const utama = celebrations[0];

                    let colorInfo = utama ? infoWarna(utama.colour) : null;
                    if (imkDay?.warnaLiturgi) {
                      const w = imkDay.warnaLiturgi.toLowerCase();
                      if (w.includes('putih')) colorInfo = infoWarna('white');
                      else if (w.includes('merah muda')) colorInfo = infoWarna('rose');
                      else if (w.includes('merah')) colorInfo = infoWarna('red');
                      else if (w.includes('ungu')) colorInfo = infoWarna('violet');
                      else if (w.includes('hijau')) colorInfo = infoWarna('green');
                    }

                    const dayTitleDisplay = imkDay?.perayaan || celebrations.map(c => c.title).join('; ') || `${dayNum} ${NAMA_BULAN_FULL[currentMonth]}`;
                    const isHighLit = imkDay?.perayaan
                      ? (imkDay.perayaan.toLowerCase().includes('pesta') || imkDay.perayaan.toLowerCase().includes('hari raya') || imkDay.perayaan.toLowerCase().includes('perayaan wajib') || imkDay.perayaan.toLowerCase().includes('minggu'))
                      : (utama ? (Number(utama.rank_num) < 3 || utama.rank === 'solemnity' || utama.rank === 'feast') : false);

                    return (
                      <button
                        type="button"
                        key={dateStr}
                        onClick={() => handleSelectDay(dateStr)}
                        title={dayTitleDisplay}
                        className={`
                          aspect-square relative flex flex-col items-center justify-center rounded-xl font-semibold text-sm sm:text-base transition-all select-none cursor-pointer
                          ${isActive 
                            ? '!bg-[#1C2B3A] !text-white shadow-[0_4px_12px_rgba(28,43,58,0.32)] ring-2 ring-[#E3C177] z-10 scale-[1.02]' 
                            : isHighLit 
                            ? 'bg-[#FBF4E4] hover:bg-[#F5E9CC] text-[#1C2B3A]' 
                            : 'bg-white hover:bg-[#F5F2EC] hover:text-[#1C5799] text-[#1C2B3A]'
                          }
                          ${isToday && !isActive ? 'border-[1.5px] border-[#A8833A] font-bold' : 'border border-transparent'}
                        `}
                      >
                        {/* Day Number */}
                        <span>{dayNum}</span>

                        {/* Liturgical dot at top-right */}
                        {colorInfo && (
                          <span 
                            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border border-black/10 shadow-3xs"
                            style={{
                              backgroundColor: colorInfo.hex,
                              borderColor: colorInfo.border
                            }}
                          />
                        )}

                        {/* Rank dot indicator */}
                        {isHighLit && (
                          <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isActive ? 'bg-[#E3C177]' : 'bg-[#A8833A]'}`} />
                        )}
                      </button>
                    );
                  })}

                  {/* Empty cells after month end */}
                  {Array.from({ length: endPadCount }).map((_, i) => (
                    <div key={`empty-end-${i}`} className="aspect-square rounded-xl opacity-0" />
                  ))}
                </div>

                {/* Liturgical Color Legend (Aktif bulan ini) */}
                <div className="mt-6 pt-4 border-t border-dashed border-[#DDD8CE]">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-[10px] font-bold tracking-wider text-[#8A8378] uppercase">
                      Warna Liturgi Bulan Ini
                    </span>
                    <span className="font-mono text-[10px] text-[#A8833A] font-medium">
                      {NAMA_BULAN_FULL[currentMonth]} {currentYear}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#8A8378]">
                    {monthColors.map((w) => (
                      <span key={w.id} className="inline-flex items-center gap-1.5 font-medium">
                        <i 
                          className="inline-block w-2.5 h-2.5 rounded-full border shadow-3xs"
                          style={{ backgroundColor: w.hex, borderColor: w.border }}
                        />
                        <span className="text-[#1C2B3A]">{w.id}</span>
                      </span>
                    ))}
                  </div>
                </div>

              </div>

              {/* Informative Guidance */}
              <div className="p-3.5 rounded-2xl bg-white/70 border border-[#E8E2D6] text-xs text-[#8A8378] flex items-start gap-2.5">
                <Info className="h-4 w-4 text-[#1C5799] shrink-0 mt-0.5" />
                <div className="leading-relaxed space-y-1">
                  <p>
                    Penanggalan liturgi terhubung langsung dengan Kalender Romawi Umum dan bacaan misa harian Gereja Katolik.
                  </p>
                  <p className="text-[11px] text-[#A8833A]">
                    Klik tanggal mana pun pada kalender untuk memeriksa bacaan dan perayaan hari tersebut.
                  </p>
                </div>
              </div>

            </div>

            {/* RIGHT: Inspiration Quote & Monthly Celebrations List */}
            <div className="lg:col-span-5 flex flex-col space-y-6">
              
              {/* Daily Catholic Spiritual Quote */}
              <div className="w-full">
                <QuoteCard />
              </div>

              {/* Monthly Celebrations Overview Panel */}
              <div className="bg-white border border-[#E8E2D6] rounded-[24px] p-6 shadow-[0_12px_24px_rgba(28,43,58,0.04)] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-[#A8833A]">
                    Perayaan Bulan Ini
                  </span>
                  <span className="text-xs font-serif font-bold text-[#1C2B3A]">
                    {NAMA_BULAN_FULL[currentMonth]} {currentYear}
                  </span>
                </div>

                {perayaanBulanIni.length > 0 ? (
                  <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 lit-scrollbar">
                    {perayaanBulanIni.map(({ dateStr, dayNum, celebration }) => {
                      const w = infoWarna(celebration.colour);
                      const r = infoRank(celebration);
                      const isSelected = (dateStr === selectedDateStr);
                      const isDayToday = (dateStr === todayStr);

                      return (
                        <div
                          key={dateStr}
                          onClick={() => handleSelectDay(dateStr)}
                          className={`
                            flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all hover:bg-[#F5F2EC]
                            ${isSelected ? 'bg-[#1C2B3A] text-white hover:bg-[#1C2B3A]' : isDayToday ? 'bg-[#FBF4E4] border border-[#C4B89A]/40' : ''}
                          `}
                        >
                          {/* Day number */}
                          <span className={`font-mono text-xs font-bold min-w-[24px] text-right mt-0.5 ${isSelected ? 'text-[#E3C177]' : 'text-[#1C5799]'}`}>
                            {dayNum}
                          </span>

                          {/* Dot */}
                          <span 
                            className="w-2.5 h-2.5 rounded-full border flex-shrink-0 mt-1.5 shadow-3xs"
                            style={{ backgroundColor: w.hex, borderColor: w.border }}
                          />

                          {/* Title & Badge */}
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-xs sm:text-sm leading-snug ${isSelected ? 'text-white' : 'text-[#1C2B3A]'}`}>
                              {celebration.title}
                              <span className={`inline-block ml-2 text-[9px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${r.bg} ${r.text}`}>
                                {r.label}
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-[#8A8378] font-mono bg-[#F5F2EC]/40 rounded-xl">
                    Tidak ada perayaan khusus yang tercatat bulan ini.
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-[#E8E2D6] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#8A8378]">
                    Klik untuk membuka di kartu atas
                  </span>
                  <button
                    type="button"
                    onClick={handleGoToToday}
                    className="font-semibold text-[#1C5799] hover:underline cursor-pointer"
                  >
                    Ke Hari Ini &rarr;
                  </button>
                </div>
              </div>

            </div>

          </div>
        </section>

      </main>

      {/* Popup Dialog for Full Indonesian Catholic Readings from Iman Katolik */}
      <ReadingsModal
        isOpen={isReadingsModalOpen}
        onClose={() => setIsReadingsModalOpen(false)}
        dateStr={selectedDateStr}
        dateFormatted={formattedSelectedDate}
        dayTitle={celebrationDetails.title}
        imanKatolikData={imanKatolikData}
        universalisData={universalisData}
        initialTab={modalInitialTab}
        isLoading={isLoadingImanKatolik}
      />

      {/* Footer */}
      <footer className="h-14 border-t border-[#E8E2D6] bg-[#F5F2EC] text-center text-xs text-[#8A8378] flex flex-wrap items-center justify-center gap-2 px-4 shrink-0">
        <span>Kalender Liturgi Katolik</span>
        <span>&bull;</span>
        <span>Liturgi Sabda &bull; Kalender Liturgi Gereja</span>
      </footer>
    </div>
  );
}
