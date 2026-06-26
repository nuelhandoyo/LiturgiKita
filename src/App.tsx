import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getLiturgicalDay, getMonthLiturgicalDays, toDateStr } from './data/liturgy';
import { LiturgicalDay } from './types';
import QuoteCard from './components/QuoteCard';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  BookOpen, 
  Sparkles, 
  Globe
} from 'lucide-react';

export default function App() {
  // Current local date anchor in 2026
  const anchorDate = new Date(2026, 5, 26); // June 26, 2026
  const todayStr = toDateStr(anchorDate);

  // States
  const [currentDate, setCurrentDate] = useState<Date>(anchorDate);
  const [days, setDays] = useState<LiturgicalDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<LiturgicalDay | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();

  // Load calendar days for the active month
  useEffect(() => {
    const monthDays = getMonthLiturgicalDays(viewYear, viewMonth);
    setDays(monthDays);
  }, [viewYear, viewMonth]);

  // Set initial detail view to today's liturgical info
  useEffect(() => {
    const todayLiturgy = getLiturgicalDay(anchorDate);
    setSelectedDay(todayLiturgy);
  }, []);

  // Connectivity monitors & service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then((reg) => console.log('Service Worker registered scope:', reg.scope))
          .catch((err) => console.error('Service Worker registration failed:', err));
      });
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handler methods
  const handlePrevMonth = () => {
    setCurrentDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleBackToToday = () => {
    setCurrentDate(anchorDate);
    const todayLiturgy = getLiturgicalDay(anchorDate);
    setSelectedDay(todayLiturgy);
  };

  // Calendar render details
  const WEEKDAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const WEEKDAYS_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const padCells = Array.from({ length: firstDayIndex });
  
  // Dynamic padding at the end to always maintain exactly 42 cells (6 rows)
  const totalCells = 42; 
  const endPadCount = totalCells - (padCells.length + days.length);
  const endPadCells = Array.from({ length: Math.max(0, endPadCount) });

  // Liturgical colors configurations
  const colorConfig = {
    green: {
      bg: 'bg-emerald-50/50',
      badgeBg: 'bg-emerald-600 text-white',
      border: 'border-emerald-600',
      cellClass: 'bg-emerald-50 hover:bg-emerald-100/70 border-emerald-200 text-emerald-950',
      dotClass: 'bg-emerald-600',
      label: 'Masa Biasa (Hijau)'
    },
    purple: {
      bg: 'bg-purple-50/50',
      badgeBg: 'bg-purple-700 text-white',
      border: 'border-purple-700',
      cellClass: 'bg-purple-50 hover:bg-purple-100/70 border-purple-200 text-purple-950',
      dotClass: 'bg-purple-600',
      label: 'Advent/Prapaskah (Ungu)'
    },
    white: {
      bg: 'bg-amber-50/20',
      badgeBg: 'bg-amber-600 text-white',
      border: 'border-amber-500',
      cellClass: 'bg-amber-50/40 hover:bg-amber-50 border-amber-200/80 text-gray-900',
      dotClass: 'bg-amber-400 border border-gray-300',
      label: 'Natal/Paskah/Pesta (Putih)'
    },
    red: {
      bg: 'bg-red-50/30',
      badgeBg: 'bg-red-600 text-white',
      border: 'border-red-600',
      cellClass: 'bg-red-50 hover:bg-red-100/70 border-red-200 text-red-950',
      dotClass: 'bg-red-600',
      label: 'Sengsara/Martir (Merah)'
    },
    gold: {
      bg: 'bg-yellow-50/40',
      badgeBg: 'bg-yellow-500 text-black',
      border: 'border-yellow-500',
      cellClass: 'bg-yellow-50 hover:bg-yellow-100/70 border-yellow-200 text-yellow-950',
      dotClass: 'bg-yellow-500',
      label: 'Hari Raya Agung (Emas)'
    },
    rose: {
      bg: 'bg-rose-50/40',
      badgeBg: 'bg-rose-500 text-white',
      border: 'border-rose-500',
      cellClass: 'bg-rose-50 hover:bg-rose-100/70 border-rose-200 text-rose-950',
      dotClass: 'bg-rose-400',
      label: 'Gaudete/Laetare (Muda)'
    }
  };

  const currentStyle = selectedDay ? (colorConfig[selectedDay.color] || colorConfig.green) : colorConfig.green;

  const formattedSelectedDate = selectedDay?.date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="lg:h-screen lg:overflow-hidden bg-[#F7F3EE] text-stone-800 font-sans flex flex-col">
      {/* 1. Header Area (Slim & high-contrast) */}
      <header className="h-14 border-b border-[#E5E0D8]/80 bg-[#F7F3EE]/80 backdrop-blur-md flex items-center shrink-0">
        <div className="mx-auto w-full max-w-6xl px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl filter drop-shadow-xs">🕊️</span>
            <div>
              <h1 className="font-serif text-lg md:text-xl font-bold tracking-tight text-stone-800 leading-tight">
                Liturgi Kita
              </h1>
              <p className="font-sans text-[9px] font-bold tracking-widest text-stone-500 uppercase">
                Kalender Liturgi Katolik &bull; PWA Edition
              </p>
            </div>
          </div>

          {/* Network Connection badge */}
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-white border border-[#E5E0D8] shadow-xs">
            {isOnline ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span className="text-emerald-700">Online</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                <span className="text-rose-600">Offline</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Integrated Layout Area (Bento Grid Layout) */}
      <main className="flex-1 min-h-0 mx-auto w-full max-w-6xl px-4 py-4 overflow-y-auto lg:overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* LEFT PANEL: Detailed Liturgical Info (Width 5 on LG) */}
          <div className="lg:col-span-5 flex flex-col h-full min-h-0 space-y-3.5">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-emerald-600" />
                <h2 className="font-serif text-base font-bold text-stone-800">Detail Hari Liturgi</h2>
              </div>
              
              {/* Reset to Today Action Button */}
              {selectedDay && selectedDay.dateStr !== todayStr && (
                <button
                  onClick={handleBackToToday}
                  className="rounded-full bg-white border border-stone-200 px-2.5 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-50 transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  Kembali ke Hari Ini
                </button>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
              <AnimatePresence mode="wait">
                {selectedDay ? (
                  <motion.div
                    key={selectedDay.dateStr}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-3.5"
                  >
                    {/* Identity Card */}
                    <div className={`bento-card border-l-[6px] ${currentStyle.border} bg-white p-4 space-y-2.5 shadow-2xs`}>
                      <div>
                        <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-stone-400 block">
                          {selectedDay.season} &bull; {selectedDay.gradeLabel}
                        </span>
                        <h3 className="font-serif text-base font-bold leading-snug text-stone-900 mt-0.5">{selectedDay.title}</h3>
                        <p className="font-sans text-[11px] text-stone-500 mt-1 font-medium">{formattedSelectedDate}</p>
                      </div>

                      {/* Color Legend for active date */}
                      <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                        <span className={`h-3.5 w-3.5 rounded-full border border-stone-300 ${selectedDay.color === 'white' ? 'bg-white' : selectedDay.color === 'gold' ? 'bg-[#F1C40F]' : selectedDay.color === 'green' ? 'bg-emerald-600' : selectedDay.color === 'purple' ? 'bg-purple-700' : selectedDay.color === 'red' ? 'bg-red-600' : 'bg-rose-400'}`} />
                        <span className="font-sans text-[10px] font-semibold text-stone-600">{currentStyle.label}</span>
                      </div>
                    </div>

                    {/* Saint celebration warning badge if applicable (only if not redundant with the main title to prevent repeated cards) */}
                    {selectedDay.feastName && 
                     !selectedDay.title.toLowerCase().includes(selectedDay.feastName.toLowerCase()) && 
                     !selectedDay.feastName.toLowerCase().includes(selectedDay.title.toLowerCase()) && (
                      <div className="bento-card bg-amber-50/40 p-3.5 border border-amber-200/50 flex items-start gap-2.5 shadow-3xs">
                        <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-amber-800">Perayaan / Peringatan</span>
                          <p className="font-serif text-xs font-bold text-stone-800 mt-0.5">{selectedDay.feastName}</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="bento-card bg-white p-6 text-center text-stone-500 text-xs font-sans shadow-3xs">
                    Pilihlah salah satu hari pada kalender untuk melihat detail liturgi.
                  </div>
                )}
              </AnimatePresence>

              {/* Inspirational Quote Card embedded beautifully inside the scrollable left panel */}
              <QuoteCard />
            </div>
          </div>

          {/* RIGHT PANEL: Complete Calendar Month Grid & Legend (Width 7 on LG) */}
          <div className="lg:col-span-7 flex flex-col h-full min-h-0 space-y-3.5">
            
            {/* Calendar Controller header card */}
            <div className="bento-card py-2.5 px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-stone-200/80 shadow-3xs shrink-0">
              <div>
                <span className="font-sans text-[9px] font-extrabold uppercase tracking-widest text-emerald-600 flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  Kalender Liturgi 2026
                </span>
                <h2 className="font-serif text-lg font-black text-stone-800 leading-none mt-0.5">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </h2>
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBackToToday}
                  className="rounded-full border border-stone-200 bg-white px-3 py-1.5 font-sans text-[10px] font-bold text-stone-700 shadow-3xs transition-all hover:bg-stone-50 active:scale-95 cursor-pointer"
                >
                  Hari Ini
                </button>
                
                <div className="flex items-center rounded-full border border-stone-200 bg-white shadow-3xs">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-50 rounded-l-full border-r border-stone-100 cursor-pointer"
                    aria-label="Bulan sebelumnya"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-50 rounded-r-full cursor-pointer"
                    aria-label="Bulan berikutnya"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Liturgical Colors Legend (Super compact single row format) */}
            <div className="bento-card bg-stone-50/60 py-2 px-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[9px] font-bold text-stone-600 border border-stone-200/50 justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 border border-emerald-700 shrink-0" />
                <span>Masa Biasa</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-700 border border-purple-800 shrink-0" />
                <span>Masa Tobat</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white border border-stone-300 shrink-0" />
                <span>Pesta/Sukacita</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600 border border-red-700 shrink-0" />
                <span>Martir</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 border border-yellow-500 shrink-0" />
                <span>Raya Agung</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400 border border-rose-500 shrink-0" />
                <span>Gaudete</span>
              </div>
            </div>

            {/* Main Calendar Grid Box (Proportionally stretches to take 100% of available height) */}
            <div className="flex-1 min-h-[340px] md:min-h-[420px] lg:min-h-0 bento-card overflow-hidden bg-white border border-stone-200/80 shadow-2xs flex flex-col">
              {/* Weekday Titles */}
              <div className="grid grid-cols-7 border-b border-stone-200/60 bg-stone-50/50 py-1.5 text-center text-[10px] font-black tracking-wider text-stone-500 uppercase shrink-0">
                {WEEKDAYS_SHORT.map((wd, i) => (
                  <div key={wd} className={i === 0 ? 'text-rose-600' : ''}>
                    <span className="hidden sm:inline">{WEEKDAYS_FULL[i]}</span>
                    <span className="inline sm:hidden">{wd}</span>
                  </div>
                ))}
              </div>

              {/* Days Grid (Using standard 6 rows to stretch perfectly) */}
              <div className="grid grid-cols-7 grid-rows-6 flex-1 divide-x divide-y divide-stone-100">
                {/* Pad cells before first of the month */}
                {padCells.map((_, i) => (
                  <div key={`pad-start-${i}`} className="bg-stone-50/10" />
                ))}

                {/* Actual Liturgical Days cells */}
                {days.map((day) => {
                  const isToday = day.dateStr === todayStr;
                  const isSelected = selectedDay?.dateStr === day.dateStr;
                  const customCellColor = colorConfig[day.color] || colorConfig.green;

                  return (
                    <div
                      key={day.dateStr}
                      onClick={() => setSelectedDay(day)}
                      className={`relative flex flex-col justify-between p-1.5 cursor-pointer transition-all border-r border-b border-gray-100 select-none overflow-hidden ${customCellColor.cellClass} ${
                        isSelected ? 'ring-2 ring-stone-800 ring-inset z-10' : ''
                      }`}
                    >
                      {/* Day Number and small color dots */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`flex h-5 w-5 md:h-6 md:w-6 items-center justify-center text-[10px] md:text-xs font-black rounded-full ${
                            isToday
                              ? 'bg-[#7B2D8B] text-white shadow-xs'
                              : day.date.getDay() === 0
                              ? 'text-rose-600'
                              : 'text-stone-800'
                          }`}
                        >
                          {day.date.getDate()}
                        </span>

                        {/* Liturgical color spot badge */}
                        <span className={`h-1.5 w-1.5 rounded-full ${customCellColor.dotClass}`} />
                      </div>

                      {/* Celebration title labels for calendar */}
                      <div className="mt-0.5 min-h-0 overflow-hidden flex flex-col justify-end">
                        <p className="line-clamp-1 text-[8px] font-black uppercase tracking-wider text-black/40">
                          {day.grade === 'solemnity' ? 'RAYA' : day.grade === 'feast' ? 'PESTA' : ''}
                        </p>
                        <p className="line-clamp-1 font-serif text-[9px] md:text-[10px] font-bold text-stone-800 leading-none">
                          {day.feastName || day.title}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Pad cells after end of the month to fill out the 6th row */}
                {endPadCells.map((_, i) => (
                  <div key={`pad-end-${i}`} className="bg-stone-50/10" />
                ))}
              </div>
            </div>

            {/* Liturgical general info notification (Super compact layout) */}
            <div className="bento-card bg-stone-50/60 p-2.5 text-[10px] leading-relaxed text-stone-600 flex items-start gap-2 border border-stone-200/50 shrink-0">
              <Info className="h-3.5 w-3.5 shrink-0 text-stone-500 mt-0.5" />
              <p>
                <strong>Informasi Kalender:</strong> Penanggalan Liturgi Romawi disesuaikan untuk tahun 2026. Klik pada salah satu kotak tanggal untuk memperbarui informasi detail hari liturgi di panel sebelah kiri secara interaktif.
              </p>
            </div>

          </div>

        </div>

      </main>

      {/* 3. Footer Copyright Info (Compact shrink-0 block) */}
      <footer className="h-10 border-t border-[#E5E0D8]/60 bg-[#F7F3EE] text-center text-[10px] text-stone-500 font-semibold flex items-center justify-center gap-1.5 shrink-0">
        <Globe className="h-3 w-3" />
        <span>Liturgi Kita &copy; 2026 &bull; Satu Halaman Terpadu</span>
      </footer>
    </div>
  );
}
