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

export const DEFAULT_MAP_SETTINGS = {
    center: [16.2280, 39.3561],

    zoom: 12,
    pitch: 0,
    maxPitch: 0
};



// czoom when the map flies to a trail chosen from the list, the surrounding area is visible
export const TRAIL_ZOOM = 13;

// zoom used when the trail is a single point (no route to fit)
export const POINT_ZOOM = 14;

// pixels left around the route when the map zooms on it on the home page
export const FIT_TRACK_PADDING = 40;

//pixels left around the route when the map zooms on it
export const ROUTE_PADDING = 64;

// distance min tra il popup e il bordo della mappa dopo lo spostamento
export const EDGE_MARGIN = 12;

// ms of the animation when recentering the map to the initial view
export const RECENTER_DURATION_MS = 1000;

// ms of the animation when fitting the map to a selected track
export const FIT_TRACK_DURATION_MS = 800;

// ms of the pan animation when fitting a popup inside the map
export const POPUP_PAN_DURATION_MS = 300;

// wait after the last map move before asking for the trails of the area
export const BOUNDS_DEBOUNCE_MS = 300;

// how long after the click the selection wins over the gps
export const GPS_GRACE_MS = 15000;