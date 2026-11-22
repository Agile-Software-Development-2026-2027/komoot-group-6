// MCP module "trail search": the tools that FIND trails.
// - search_trails_nearby: trails near a position   -> GET /api/trails/nearby
// - trails_in_area:       trails inside a rectangle -> GET /api/trails?bbox=...
// No login is needed: they only read public data.

import * as z from 'zod/v4';
import { textResult, errorResult } from './toolResults.js';

const DIFFICULTY_WORDS = { T: 'easy', E: 'intermediate', EE: 'difficult', EEA: 'difficult, equipment needed' };
const CAI_GRADES = ['T', 'E', 'EE', 'EEA'];

const BACKEND_LIMIT = 100;

const MAX_RESULTS = 20;

const MAX_NAME_LENGTH = 80;


const filterFields = {
  difficulty: z
    .array(z.enum(CAI_GRADES))
    .min(1)
    .optional()
    .describe('Only these CAI grades: T = easy, E = intermediate, EE = difficult, EEA = with equipment'),
  max_length_km: z.number().positive().max(500).optional().describe('Only trails up to this length, in km'),
  limit: z.number().int().min(1).max(MAX_RESULTS).default(10).describe(`How many trails to return (max ${MAX_RESULTS})`),
};


export function toTrailSummary(feature) {
  const p = feature.properties ?? {};
  const name = String(p.name ?? 'Unnamed trail');
  const [lng, lat] = p.startPoint ?? [];
  return {
    id: p.id,
    name: name.length > MAX_NAME_LENGTH ? `${name.slice(0, MAX_NAME_LENGTH)}…` : name,
    difficulty: p.difficulty ?? null,
    difficultyText: DIFFICULTY_WORDS[p.difficulty] ?? 'unknown',
    type: p.trailType ?? null,
    lengthKm: Number.isFinite(p.lengthM) ? Math.round(p.lengthM / 100) / 10 : null,
    ascentM: p.ascentM ?? null,
    durationMin: p.estDurationMin ?? null,
    start: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
    // Only in the "nearby" answers: how far the trail passes from the position
    ...(Number.isFinite(p.distanceM) && { distanceKm: Math.round(p.distanceM / 100) / 10 }),
  };
}

export function applyFilters(trails, { difficulty, max_length_km, limit }) {
  return trails
    .filter((t) => !difficulty || difficulty.includes(t.difficulty))
    .filter((t) => max_length_km === undefined || (t.lengthKm !== null && t.lengthKm <= max_length_km))
    .slice(0, limit);
}


export function formatTrailLine(t, index) {
  const parts = [`${t.difficulty ?? '?'} (${t.difficultyText})`];
  if (t.lengthKm !== null) parts.push(`${t.lengthKm} km`);
  if (t.ascentM !== null) parts.push(`ascent ${t.ascentM} m`);
  if (t.durationMin !== null) parts.push(`about ${Math.floor(t.durationMin / 60)}h${String(t.durationMin % 60).padStart(2, '0')}`);
  if (t.distanceKm !== undefined) parts.push(`${t.distanceKm} km away`);
  return `${index + 1}. ${t.name} [id: ${t.id}]: ${parts.join(', ')}`;
}


function trailListResult(trails, emptyText) {
  if (trails.length === 0) return textResult(emptyText, { count: 0, trails: [] });
  const text = `${trails.length} trail(s) found:\n${trails.map(formatTrailLine).join('\n')}\n` +
    'Use get_trail with the id to read the details of one trail.';
  return textResult(text, { count: trails.length, trails });
}


export function registerTrailSearchTools(server, backend) {
  server.registerTool(
    'search_trails_nearby',
    {
      title: 'Search trails nearby',
      description:
        'Find hiking trails that pass near a position, closest first. ' +
        'Use it when the user asks for trails near a place or near coordinates: ' +
        'if the user names a place, use its latitude and longitude in decimal degrees. ' +
        'It can filter by CAI difficulty and maximum length.',
      inputSchema: z.object({
        lat: z.number().min(-90).max(90).describe('Latitude in decimal degrees, e.g. 39.36'),
        lng: z.number().min(-180).max(180).describe('Longitude in decimal degrees, e.g. 16.23'),
        radius_km: z.number().min(0.1).max(50).default(5).describe('Search radius in km (max 50)'),
        ...filterFields,
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ lat, lng, radius_km, ...filters }) => {
      try {
        const data = await backend.nearbyTrails({
          lat,
          lng,
          radius: Math.round(radius_km * 1000), // the backend wants meters
          limit: BACKEND_LIMIT, // filters are applied here, so we ask for more
        });
        const trails = applyFilters((data.features ?? []).map(toTrailSummary), filters);
        return trailListResult(trails, `No trails within ${radius_km} km with these filters.`);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'trails_in_area',
    {
      title: 'Trails in an area',
      description:
        'List the hiking trails whose start point is inside a rectangle of the map ' +
        '(west/south/east/north borders in decimal degrees). Use it for a whole zone, ' +
        'e.g. "trails in the Sila"; for "near a point" use search_trails_nearby instead.',
      inputSchema: z
        .object({
          min_lng: z.number().min(-180).max(180).describe('West border (longitude)'),
          min_lat: z.number().min(-90).max(90).describe('South border (latitude)'),
          max_lng: z.number().min(-180).max(180).describe('East border (longitude)'),
          max_lat: z.number().min(-90).max(90).describe('North border (latitude)'),
          ...filterFields,
        })
        .refine((a) => a.min_lng < a.max_lng && a.min_lat < a.max_lat, {
          message: 'min_lng must be smaller than max_lng and min_lat smaller than max_lat',
        }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ min_lng, min_lat, max_lng, max_lat, ...filters }) => {
      try {
        const data = await backend.listTrails({ minLng: min_lng, minLat: min_lat, maxLng: max_lng, maxLat: max_lat });
        // The backend gives them in no particular order: by name, so the answer is stable
        const all = (data.features ?? []).map(toTrailSummary).sort((a, b) => a.name.localeCompare(b.name));
        return trailListResult(applyFilters(all, filters), 'No trails start in this area with these filters.');
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}