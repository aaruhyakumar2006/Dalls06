import React from 'react';

export function ShuttleIcon({ className = 'w-5 h-5', ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Shuttle cork base */}
      <circle cx="12" cy="18" r="3.5" fill="currentColor" fillOpacity="0.25" />
      {/* Skirt lines / feathers */}
      <path d="M8.5 15.5L5 6h14l-3.5 9.5" />
      <path d="M12 14.5V6" />
      <path d="M6 9.5h12" />
      <path d="M7 12.5h10" />
    </svg>
  );
}

export function RacketIcon({ className = 'w-5 h-5', ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Oval head */}
      <ellipse cx="15" cy="9" rx="6" ry="6.5" />
      {/* String pattern */}
      <path d="M11 9h8" strokeWidth="1.5" />
      <path d="M15 5v8" strokeWidth="1.5" />
      {/* Shaft */}
      <path d="M10.8 13.2L4 20" />
      {/* Grip */}
      <path d="M3 19l2 2" strokeWidth="3" />
    </svg>
  );
}

export function CourtCornerIcon({ className = 'w-5 h-5', ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M4 14V4h10" />
      <circle cx="4" cy="4" r="2" fill="currentColor" />
    </svg>
  );
}

export function FlameIcon({ className = 'w-5 h-5', ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path
        d="M12 2c1 3.5-1 5.5-2 8-1 2.5 0 5 2 6 2 1 4 0 5-2 1-2 0-4-1-5 2 1 4 3.5 4 7 0 4.4-3.6 8-8 8s-8-3.6-8-8c0-4 3-7 5-10 1-1.5 2-3 3-4z"
        fill="currentColor"
        fillOpacity="0.2"
      />
    </svg>
  );
}
