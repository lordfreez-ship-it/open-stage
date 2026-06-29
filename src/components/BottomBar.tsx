'use client';

const SWISH_NUMBER = process.env.NEXT_PUBLIC_SWISH_NUMBER || '';
const GOOGLE_REVIEW_URL = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || '';
const FACEBOOK_URL = process.env.NEXT_PUBLIC_FACEBOOK_URL || '';
const YOUTUBE_URL = process.env.NEXT_PUBLIC_YOUTUBE_URL || '';

export default function BottomBar() {
  const swishData = JSON.stringify({
    format: 'raw',
    version: 1,
    payee: { value: SWISH_NUMBER },
    message: { value: 'Open Stage tip' },
  });
  const swishUrl = `swish://payment?data=${encodeURIComponent(swishData)}`;

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[640px] lg:max-w-[720px] backdrop-blur-[18px] border-t border-[#1E1E1E] px-3.5 md:px-6 py-2.5 md:py-3.5 z-50"
      style={{ background: 'rgba(14,14,14,0.98)' }}>
      <div className="flex items-center gap-2">
        <a
          href={swishUrl}
          className="flex-1 bg-[rgba(0,200,83,0.1)] text-[#00C853] border border-[rgba(0,200,83,0.25)] rounded-[9px] py-2.5 text-[13px] font-bold cursor-pointer flex items-center justify-center gap-[5px]"
        >
          💚 Swish
        </a>
        <a
          href={GOOGLE_REVIEW_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-[rgba(201,146,42,0.1)] text-[#C9922A] border border-[rgba(201,146,42,0.25)] rounded-[9px] py-2.5 text-[13px] font-bold cursor-pointer flex items-center justify-center gap-[5px]"
        >
          ★ Recension
        </a>
        <a
          href={FACEBOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-[42px] h-[42px] bg-[#1A2535] border border-[#1E3050] rounded-[9px] flex items-center justify-center text-[15px] font-bold text-[#5090CF] shrink-0"
        >
          f
        </a>
        <a
          href={YOUTUBE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-[42px] h-[42px] bg-[#2A1515] border border-[#3D1C1C] rounded-[9px] flex items-center justify-center text-base text-[#FF5555] shrink-0"
        >
          ▶
        </a>
      </div>
    </div>
  );
}
