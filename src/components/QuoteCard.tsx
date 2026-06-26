import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quote } from '../types';
import { getRandomQuote } from '../data/quotes';
import { Quote as QuoteIcon, RefreshCw } from 'lucide-react';

export default function QuoteCard() {
  const [quote, setQuote] = useState<Quote>(getRandomQuote());
  const [isRotating, setIsRotating] = useState(false);

  const handleNewQuote = () => {
    setIsRotating(true);
    setQuote(getRandomQuote());
    setTimeout(() => setIsRotating(false), 600);
  };

  return (
    <div id="quote-card-container" className="rounded-[24px] border border-stone-800 bg-stone-900 p-6 md:p-8 shadow-sm hover:translate-y-[-2px] transition-all relative overflow-hidden text-left flex flex-col justify-between h-full">
      {/* Background quote mark */}
      <div className="absolute -top-4 -right-4 opacity-10 pointer-events-none select-none text-white text-[120px] font-serif leading-none">
        &ldquo;
      </div>

      {/* Quote Content with Animation */}
      <div className="min-h-[100px] flex flex-col justify-center relative z-10 my-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={quote.quote}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            <p className="font-serif text-lg md:text-xl font-bold italic leading-relaxed text-white">
              &ldquo;{quote.quote}&rdquo;
            </p>
            
            <p className="font-sans text-xs font-bold tracking-widest text-stone-300 uppercase">
              &mdash; {quote.author} {quote.year ? `(${quote.year})` : ''}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Button & Header row */}
      <div className="mt-4 flex items-center justify-between border-t border-stone-800 pt-4 relative z-10 shrink-0">
        <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-stone-500">
          <QuoteIcon className="h-3 w-3 text-stone-400" />
          <span>Inspirasi Doa</span>
        </div>
        <button
          id="btn-quote-baru"
          onClick={handleNewQuote}
          className="inline-flex items-center gap-2 rounded-full border border-stone-800 bg-stone-800/50 hover:bg-stone-800 px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-wider text-stone-300 transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`h-3 w-3 transition-transform duration-500 ${isRotating ? 'rotate-180' : ''}`} />
          Acak Baru
        </button>
      </div>
    </div>
  );
}
