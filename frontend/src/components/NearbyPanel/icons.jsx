const LINE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export function ClockIcon() {
  return (
    <svg {...LINE} width="16" height="16">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function DistanceIcon() {
  return (
    <svg {...LINE} width="16" height="16">
      <path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" />
    </svg>
  );
}

export function ClimbIcon() {
  return (
    <svg {...LINE} width="16" height="16">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg {...LINE} width="14" height="14">
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

// Segnalibro: pieno quando il sentiero è già salvato
export function BookmarkIcon({ filled }) {
  return (
    <svg {...LINE} width="18" height="18" fill={filled ? 'currentColor' : 'none'}>
      <path d="M6 3h12v18l-6-4.5L6 21z" />
    </svg>
  );
}

// Segnaposto sulla mappa per il sentiero scelto (la punta in basso indica il punto di partenza)
export function MapPinIcon({ className }) {
  return (
    <svg className={className} width="34" height="44" viewBox="0 0 34 44" aria-hidden="true">
      <path
        d="M17 42s14-13.2 14-24.5A14 14 0 0 0 3 17.5C3 28.8 17 42 17 42z"
        style={{ fill: 'var(--color-primary)' }}
        stroke="#fff"
        strokeWidth="2.5"
      />
      <circle cx="17" cy="17.5" r="5.5" fill="#fff" />
    </svg>
  );
}

// Icon of the "Trails nearby" button in the map toolbar
export function TrailsIcon() {
  return (
    <svg {...LINE} width="22" height="22">
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="5" r="2" />
      <path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7" />
    </svg>
  );
}

// Cross of the button that closes the panel
export function CloseIcon() {
  return (
    <svg {...LINE} width="20" height="20">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// Spunta per il completamento del sentiero (SCRUM-51)
export function CheckIcon() {
  return (
    <svg {...LINE} width="18" height="18" fill="none">
      <path d="M20 6L9 17l-5-5" strokeWidth="2.5" />
    </svg>
  );
}

