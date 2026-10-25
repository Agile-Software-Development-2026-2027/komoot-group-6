export const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY;

if (!MAPTILER_API_KEY) {
    console.warn("API key non trovata nel file .env!");
}
export const MAPTILER_OUTDOOR_STYLE = `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_API_KEY}`;

export const DEFAULT_MAP_SETTINGS = {
    style: MAPTILER_OUTDOOR_STYLE,
    center: [12.496367, 41.902783],
    zoom: 12,
};

