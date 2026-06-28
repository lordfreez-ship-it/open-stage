'use client';

const SWISH_NUMBER = process.env.NEXT_PUBLIC_SWISH_NUMBER || '';
const GOOGLE_REVIEW_URL = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || '';
const FACEBOOK_URL = process.env.NEXT_PUBLIC_FACEBOOK_URL || '';
const YOUTUBE_URL = process.env.NEXT_PUBLIC_YOUTUBE_URL || '';

export default function Footer() {
  const swishData = JSON.stringify({
    format: 'raw',
    version: 1,
    payee: { value: SWISH_NUMBER },
    message: { value: 'Open Stage tip' },
  });
  const swishUrl = `swish://payment?data=${encodeURIComponent(swishData)}`;

  return (
    <footer className="mt-auto border-t border-white/10 bg-[#1A1A1A] px-4 py-6 text-center space-y-4">
      <div className="flex justify-center gap-3 flex-wrap">
        <a
          href={swishUrl}
          className="inline-flex items-center gap-2 bg-[#58B847] text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:brightness-110 transition"
        >
          <SwishIcon /> Swish
        </a>
        <a
          href={GOOGLE_REVIEW_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#C9922A] text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:brightness-110 transition"
        >
          ⭐ Recensera / Review
        </a>
      </div>

      <div>
        <p className="text-white/50 text-xs mb-2">Följ mig / Follow me</p>
        <div className="flex justify-center gap-3">
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
            aria-label="Facebook"
          >
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </a>
          <a
            href={YOUTUBE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
            aria-label="YouTube"
          >
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </a>
        </div>
      </div>
    </footer>
  );
}

function SwishIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill="white" fillOpacity="0.2"/>
      <path d="M7 13.5C7 13.5 9.5 8.5 12 10.5C14.5 12.5 17 7.5 17 7.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}
