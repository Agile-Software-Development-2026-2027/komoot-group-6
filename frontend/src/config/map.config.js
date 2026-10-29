export const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY;

if (!MAPTILER_API_KEY) {
    console.warn("API key non trovata nel file .env!");
}

const styleUrl = (styleId) =>
    `https://api.maptiler.com/maps/${styleId}/style.json?key=${MAPTILER_API_KEY}`;

// Mappe di base disponibili. La prima è quella iniziale.
export const MAP_BASE_STYLES = [
    { id: 'outdoor', label: 'Outdoor', url: styleUrl('outdoor-v2') },
];

// Layer degli stili MapTiler da nascondere sempre si possono cambiare in futuro
// il layer non è rimosso ma solo nascosto, quindi si può riattivare in futuro
// ma vengono nascosti prima del caricamento perciò non stanno nella lista dei layers

export const HIDDEN_BASE_LAYERS = [

    // Administrative boundaries
    'Other border',
    'Disputed border',
    'Country border',

    // Colored hiking trails
    'Purple trail',
    'Orange trail',
    'Red trail',
    'Yellow trail',
    'Green trail',
    'Blue trail',
    'Brown trail',
    'Black trail',

    // Cycling routes
    'Bicycle local',
    'Bicycle longdistance',

    // Other trail routes
    'Longdistance trail',
    'Longdistance trail outline',
];

//volendo in futuro si può cambiare lo stile di default della mappa outdoor con un altro stile disponibile in MAP_BASE_STYLES (da aggiungere)
export const MAPTILER_OUTDOOR_STYLE = MAP_BASE_STYLES[0].url;

export const DEFAULT_MAP_SETTINGS = {
    style: MAPTILER_OUTDOOR_STYLE,
    center: [16.2280, 39.3561],

    zoom: 12,
    pitch: 0,
    maxPitch: 0
};