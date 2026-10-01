import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ImanKatolikDayData, ImanKatolikReadingItem } from '../data/imankatolik';
import { UniversalisMassData, decodeHtmlEntities } from '../data/universalis';
import { 
  X, 
  BookOpen, 
  Scroll, 
  Sparkles, 
  ExternalLink,
  Copy,
  Check,
  Globe,
  Volume2,
  VolumeX,
  Church,
  Flame,
  Bookmark
} from 'lucide-react';

interface ReadingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  dateFormatted: string;
  dayTitle: string;
  imanKatolikData: ImanKatolikDayData | null;
  universalisData?: UniversalisMassData | null;
  initialTab?: string;
  isLoading?: boolean;
}

export default function ReadingsModal({
  isOpen,
  onClose,
  dateStr,
  dateFormatted,
  dayTitle,
  imanKatolikData,
  universalisData,
  initialTab = 'all',
  isLoading = false
}: ReadingsModalProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [showVerseNumbers, setShowVerseNumbers] = useState<boolean>(true);

  // Self-managed modal data to guarantee exact matching with dateStr
  const [modalData, setModalData] = useState<ImanKatolikDayData | null>(
    imanKatolikData && imanKatolikData.date === dateStr ? imanKatolikData : null
  );
  const [isModalLoading, setIsModalLoading] = useState<boolean>(isLoading);

  useEffect(() => {
    if (!isOpen || !dateStr) return;

    if (imanKatolikData && imanKatolikData.date === dateStr) {
      setModalData(imanKatolikData);
      setIsModalLoading(false);
      return;
    }

    // Auto-fetch for the current dateStr if not provided or stale
    setIsModalLoading(true);
    let isCancelled = false;
    fetchImanKatolikDay(dateStr)
      .then((data) => {
        if (!isCancelled && data && data.date === dateStr) {
          setModalData(data);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsModalLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, dateStr, imanKatolikData]);

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'all');
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
    }
  }, [isOpen, initialTab]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fontClass = fontSize === 'normal' 
    ? 'text-sm sm:text-base leading-relaxed' 
    : fontSize === 'large' 
    ? 'text-base sm:text-lg leading-relaxed' 
    : 'text-lg sm:text-xl leading-relaxed';

  // Read celebration title & color from Iman Katolik or fallback
  const celebrationName = modalData?.perayaan || dayTitle;
  const warnaLiturgi = modalData?.warnaLiturgi || 'Putih';

  // Get color styles for badge
  const getColorBadge = (color: string) => {
    const lower = color.toLowerCase();
    if (lower.includes('putih')) return 'bg-amber-100 text-amber-900 border-amber-300';
    if (lower.includes('merah muda') || lower.includes('rosario')) return 'bg-pink-100 text-pink-900 border-pink-300';
    if (lower.includes('merah')) return 'bg-rose-100 text-rose-900 border-rose-300';
    if (lower.includes('ungu')) return 'bg-purple-100 text-purple-900 border-purple-300';
    return 'bg-emerald-100 text-emerald-900 border-emerald-300';
  };

  const readings = modalData?.readings || [];

  // Filter readings based on activeTab with graceful fallback
  const hasMatchingTab = readings.some(r => r.id === activeTab || r.type === activeTab);
  const effectiveTab = (activeTab === 'all' || activeTab === 'imankatolik_web' || hasMatchingTab) 
    ? activeTab 
    : 'all';
  const visibleReadings = effectiveTab === 'all' 
    ? readings 
    : readings.filter(r => r.id === effectiveTab || r.type === effectiveTab);

  // Copy plain text of current readings
  const handleCopyText = () => {
    let textToCopy = `BACAAN LITURGI SABDA - ${dateFormatted}\n`;
    textToCopy += `${celebrationName}\nWarna Liturgi: ${warnaLiturgi}\n\n`;

    const targetList = activeTab === 'all' ? readings : visibleReadings;
    for (const r of targetList) {
      textToCopy += `--- ${r.label.toUpperCase()} (${r.reference}) ---\n`;
      if (r.verses && r.verses.length > 0) {
        textToCopy += r.verses.map(v => `${v.ref} ${v.text}`).join('\n') + '\n\n';
      } else if (r.fullText) {
        textToCopy += `${r.fullText}\n\n`;
      }
    }
    textToCopy += `Sumber: Kalender Liturgi Iman Katolik (imankatolik.or.id)`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // Text-to-speech audio toggle
  const toggleAudio = () => {
    if (!('speechSynthesis' in window)) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const targetList = activeTab === 'all' ? readings : visibleReadings;
    let spokenText = `${celebrationName}. `;
    for (const r of targetList) {
      spokenText += `${r.label}, dari ${r.reference}. `;
      spokenText += `${r.fullText}. `;
      if (r.type === 'injil') {
        spokenText += 'Demikianlah Injil Tuhan. Terpujilah Kristus. ';
      } else if (r.type !== 'mazmur') {
        spokenText += 'Demikianlah sabda Tuhan. Syukur kepada Allah. ';
      }
    }

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = 'id-ID';
    utterance.rate = 0.92;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#1C2B3A]/70 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#FDFBF7] rounded-2xl shadow-2xl border border-[#E8E2D6] overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#E8E2D6] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#7A2E39]/10 text-[#7A2E39] border border-[#7A2E39]/20">
                  <Church className="w-3 h-3 text-[#7A2E39]" />
                  Liturgi Sabda Gereja Katolik
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getColorBadge(warnaLiturgi)}`}>
                  <Flame className="w-3 h-3" />
                  Warna: {warnaLiturgi}
                </span>
                <span className="text-xs text-[#8A8378] font-medium hidden sm:inline">
                  {dateFormatted}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-serif text-[#1C2B3A] leading-snug">
                {celebrationName}
              </h2>
            </div>

            {/* Quick Actions (Audio, Copy, Font Size, Close) */}
            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
              {'speechSynthesis' in window && (
                <button
                  type="button"
                  onClick={toggleAudio}
                  title={isPlayingAudio ? "Hentikan Suara" : "Dengarkan Pembacaan"}
                  className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition-all ${
                    isPlayingAudio
                      ? 'bg-[#7A2E39] text-white border-[#7A2E39] animate-pulse'
                      : 'bg-white text-[#5D5343] border-[#E8E2D6] hover:bg-[#F5F2EC]'
                  }`}
                >
                  {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isPlayingAudio ? 'Berhenti' : 'Dengar'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyText}
                title="Salin Teks Bacaan"
                className="p-2 rounded-lg border border-[#E8E2D6] bg-white text-[#5D5343] hover:bg-[#F5F2EC] text-xs font-medium flex items-center gap-1 transition-colors"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">{isCopied ? 'Tersalin' : 'Salin'}</span>
              </button>

              <div className="flex items-center bg-[#F5F2EC] rounded-lg p-0.5 border border-[#E8E2D6]">
                <button
                  type="button"
                  onClick={() => setFontSize('normal')}
                  className={`px-2 py-1 text-xs font-bold rounded ${fontSize === 'normal' ? 'bg-white shadow-xs text-[#1C2B3A]' : 'text-[#8A8378]'}`}
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize('large')}
                  className={`px-2 py-1 text-xs font-bold rounded ${fontSize === 'large' ? 'bg-white shadow-xs text-[#1C2B3A]' : 'text-[#8A8378]'}`}
                >
                  A+
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize('xlarge')}
                  className={`px-2 py-1 text-xs font-bold rounded ${fontSize === 'xlarge' ? 'bg-white shadow-xs text-[#1C2B3A]' : 'text-[#8A8378]'}`}
                >
                  A++
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-[#8A8378] hover:text-[#1C2B3A] hover:bg-[#F5F2EC] transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Reading Navigation Tabs */}
          <div className="px-4 py-2 border-b border-[#E8E2D6] bg-[#F5F2EC]/80 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
            <div className="flex items-center gap-1.5 min-w-max">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-[#7A2E39] text-white shadow-xs'
                    : 'bg-white text-[#5D5343] border border-[#E8E2D6] hover:bg-[#EDE8DF]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Semua Bacaan ({readings.length})
              </button>

              {readings.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveTab(r.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    activeTab === r.id
                      ? 'bg-[#7A2E39] text-white shadow-xs'
                      : 'bg-white text-[#5D5343] border border-[#E8E2D6] hover:bg-[#EDE8DF]'
                  }`}
                >
                  {r.type === 'injil' && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                  {r.type === 'mazmur' && <Scroll className="w-3.5 h-3.5 text-blue-500" />}
                  {r.type === 'bco' && <Bookmark className="w-3.5 h-3.5 text-purple-500" />}
                  <span>{r.label}</span>
                  <span className="text-[10px] font-normal opacity-75">({r.reference})</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => setActiveTab('imankatolik_web')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'imankatolik_web'
                    ? 'bg-[#1C2B3A] text-white shadow-xs'
                    : 'bg-white text-[#5D5343] border border-[#E8E2D6] hover:bg-[#EDE8DF]'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Kalender Asli
              </button>
            </div>

            {/* Toggle Verse Numbers */}
            <div className="hidden md:flex items-center shrink-0">
              <label className="flex items-center gap-1.5 text-xs text-[#5D5343] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showVerseNumbers}
                  onChange={(e) => setShowVerseNumbers(e.target.checked)}
                  className="rounded border-[#C2B8A3] text-[#7A2E39] focus:ring-[#7A2E39]"
                />
                <span>Nomor Ayat</span>
              </label>
            </div>
          </div>

          {/* Modal Body / Readings Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {isModalLoading && readings.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-[#7A2E39] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-[#8A8378]">Memuat bacaan liturgi resmi...</p>
              </div>
            ) : activeTab === 'imankatolik_web' ? (
              /* Original Iman Katolik Calendar View Tab */
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-[#E8E2D6]">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C2B3A]">
                      Kalender Liturgi Resmi Iman Katolik
                    </h3>
                    <p className="text-xs text-[#8A8378]">
                      Sumber penanggalan dan bacaan Misa Gereja Katolik Indonesia (imankatolik.or.id)
                    </p>
                  </div>
                  <a
                    href={modalData?.sourceUrl || "https://www.imankatolik.or.id/kalender.php"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#7A2E39] text-white text-xs font-semibold hover:bg-[#60222B] transition-colors shrink-0"
                  >
                    <span>Buka Situs Asli</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="w-full h-[620px] rounded-xl overflow-hidden border border-[#E8E2D6] bg-white shadow-inner">
                  <iframe
                    src={`/api/imankatolik-view?b=${new Date(dateStr).getMonth() + 1}&t=${new Date(dateStr).getFullYear()}`}
                    title="Iman Katolik Kalender"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            ) : visibleReadings.length > 0 ? (
              /* Render Visible Readings */
              <div className="space-y-6">
                {visibleReadings.map((reading) => (
                  <ReadingCard
                    key={reading.id}
                    reading={reading}
                    fontClass={fontClass}
                    showVerseNumbers={showVerseNumbers}
                  />
                ))}
              </div>
            ) : (
              /* Fallback if no readings loaded */
              <div className="p-8 bg-white rounded-2xl border border-[#E8E2D6] text-center space-y-4">
                <BookOpen className="w-12 h-12 text-[#8A8378] mx-auto opacity-40" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#1C2B3A]">
                    Teks Bacaan Sedang Dimuat
                  </h3>
                  <p className="text-sm text-[#8A8378] max-w-md mx-auto">
                    Teks bacaan liturgi untuk tanggal ini sedang disiapkan dari pangkalan data Iman Katolik.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('imankatolik_web')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7A2E39] text-white text-sm font-semibold hover:bg-[#60222B] transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Buka Kalender Asli
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#E8E2D6] bg-[#F5F2EC] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#8A8378] shrink-0">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <span>Kalender Liturgi Iman Katolik</span>
              <span>&bull;</span>
              <span>Terjemahan Baru LAI Katolik / Leksionari KWI</span>
            </div>
            <a
              href={modalData?.sourceUrl || "https://www.imankatolik.or.id/kalender.php"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#7A2E39] hover:underline font-semibold"
            >
              <span>imankatolik.or.id</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Single Reading Section Component
function ReadingCard({
  reading,
  fontClass,
  showVerseNumbers
}: {
  key?: string;
  reading: ImanKatolikReadingItem;
  fontClass: string;
  showVerseNumbers: boolean;
}) {
  const isGospel = reading.type === 'injil';
  const isPsalm = reading.type === 'mazmur';
  const isBco = reading.type === 'bco';

  return (
    <article
      className={`rounded-2xl border transition-all ${
        isGospel
          ? 'bg-amber-50/40 border-amber-200/80 shadow-xs'
          : isPsalm
          ? 'bg-blue-50/30 border-blue-200/70'
          : isBco
          ? 'bg-purple-50/20 border-purple-200/70'
          : 'bg-white border-[#E8E2D6]'
      }`}
    >
      {/* Reading Header */}
      <div className="px-5 py-3.5 border-b border-[#E8E2D6]/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
              isGospel
                ? 'bg-amber-500 text-white'
                : isPsalm
                ? 'bg-blue-600 text-white'
                : isBco
                ? 'bg-purple-600 text-white'
                : 'bg-[#7A2E39] text-white'
            }`}
          >
            {isGospel ? '✝' : isPsalm ? '♫' : isBco ? '📖' : 'I'}
          </span>
          <div>
            <h3 className="text-sm font-bold text-[#1C2B3A]">{reading.label}</h3>
            <p className="text-xs font-mono font-medium text-[#7A2E39]">
              {reading.reference}
            </p>
          </div>
        </div>

        <a
          href={`https://www.imankatolik.or.id/alkitabq.php?q=${encodeURIComponent(reading.query)}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Buka referensi teks di imankatolik.or.id"
          className="text-[11px] text-[#8A8378] hover:text-[#7A2E39] flex items-center gap-1 transition-colors"
        >
          <span>Teks Asli</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Liturgical Introduction Cue */}
      <div className="px-5 pt-4 pb-2">
        {isGospel && (
          <div className="p-3 mb-4 rounded-xl bg-amber-100/50 border border-amber-200 text-xs text-amber-950 font-serif leading-relaxed space-y-1">
            <p className="font-semibold italic">
              "Inilah Injil Suci menurut {reading.reference.split(' ')[0] || 'Matius'}:"
            </p>
            <p className="text-amber-800 font-bold">
              Umat menyahut: &ldquo;Dimuliakanlah Tuhan.&rdquo;
            </p>
          </div>
        )}

        {reading.type === 'bacaan_1' && (
          <p className="text-xs text-[#8A8378] italic font-serif mb-3">
            Bacaan Pertama diambil dari Kitab {reading.reference}:
          </p>
        )}

        {reading.type === 'bacaan_2' && (
          <p className="text-xs text-[#8A8378] italic font-serif mb-3">
            Bacaan Kedua diambil dari Surat {reading.reference}:
          </p>
        )}

        {isBco && (
          <p className="text-xs text-[#8A8378] italic font-serif mb-3">
            Bacaan Ibadat Harian (Brevir) dari Kitab {reading.reference}:
          </p>
        )}

        {/* Verses Content */}
        <div className={`text-[#1C2B3A] font-serif ${fontClass} space-y-3.5`}>
          {reading.verses && reading.verses.length > 0 ? (
            reading.verses.map((verse, idx) => (
              <p key={idx} className="leading-relaxed">
                {showVerseNumbers && (
                  <sup className="inline-block mr-1.5 px-1 py-0.2 rounded text-[10px] font-sans font-bold text-[#7A2E39] bg-[#7A2E39]/10 select-none">
                    {verse.number || verse.ref}
                  </sup>
                )}
                <span>{verse.text}</span>
              </p>
            ))
          ) : reading.fullText ? (
            <p className="leading-relaxed whitespace-pre-line">{reading.fullText}</p>
          ) : (
            <div className="py-6 px-4 bg-[#F5F2EC]/60 rounded-xl text-center space-y-2 border border-[#E8E2D6]/80 my-2">
              <div className="w-5 h-5 border-2 border-[#7A2E39] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#8A8378]">
                Memuat naskah teks lengkap untuk <strong>{reading.reference}</strong> dari imankatolik.or.id...
              </p>
              {reading.query && (
                <a
                  href={`https://www.imankatolik.or.id/alkitabq.php?q=${encodeURIComponent(reading.query)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#7A2E39] font-semibold hover:underline"
                >
                  <span>Buka di Alkitab Online Iman Katolik</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Liturgical Ending Response Cue */}
        <div className="mt-5 pt-3 border-t border-[#E8E2D6]/60 text-xs font-serif text-[#5D5343] space-y-1">
          {isGospel ? (
            <div>
              <p className="italic text-[#7A2E39] font-medium">Demikianlah Injil Tuhan.</p>
              <p className="font-bold text-[#1C2B3A]">Umat menyahut: &ldquo;Terpujilah Kristus.&rdquo;</p>
            </div>
          ) : isPsalm ? (
            <p className="italic text-[#8A8378]">Mazmur Tanggapan dibawakan bersama refren umat.</p>
          ) : (
            <div>
              <p className="italic text-[#7A2E39] font-medium">Demikianlah sabda Tuhan.</p>
              <p className="font-bold text-[#1C2B3A]">Umat menyahut: &ldquo;Syukur kepada Allah.&rdquo;</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
