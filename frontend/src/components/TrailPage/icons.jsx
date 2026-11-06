// Line icons of the trail page. They take the color of the text around them (currentColor)
// and are hidden from screen readers: the text next to them already says everything.

const LINE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export function ChevronLeftIcon() {
  return (
    <svg {...LINE} strokeWidth="2.2" width="18" height="18">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function ChevronRightIcon() {
  return (
    <svg {...LINE} strokeWidth="2.2" width="16" height="16">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg {...LINE} width="22" height="22">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function DistanceIcon() {
  return (
    <svg {...LINE} width="22" height="22">
      <path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" />
    </svg>
  );
}

export function AscentIcon() {
  return (
    <svg {...LINE} width="22" height="22">
      <path d="M3 18l6-6 4 4 8-8" />
      <path d="M15 8h6v6" />
    </svg>
  );
}

export function DescentIcon() {
  return (
    <svg {...LINE} width="22" height="22">
      <path d="M3 6l6 6 4-4 8 8" />
      <path d="M15 16h6v-6" />
    </svg>
  );
}

export function PeakIcon() {
  return (
    <svg {...LINE} width="22" height="22">
      <path d="M2 20l7-12 4 6 3-4 6 10z" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg {...LINE} width="20" height="20">
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function DirectionsIcon() {
  return (
    <svg {...LINE} width="18" height="18">
      <path d="M3 11l18-8-8 18-2-8z" />
    </svg>
  );
}

export function CommentIcon() {
  return (
    <svg {...LINE} width="28" height="28">
      <path d="M4 5h16v11H9l-5 4z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  );
}

// Heart of the like button: empty (outline only) or filled, always in the color of the text around it
export function HeartIcon({ filled = false }) {
  return (
    <svg {...LINE} width="22" height="22" fill={filled ? 'currentColor' : 'none'}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}
