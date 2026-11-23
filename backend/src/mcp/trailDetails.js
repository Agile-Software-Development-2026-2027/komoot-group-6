// MCP module "trail details": lets an AI assistant read everything we know about one trail.
// It adds:
//   - the tool     get_trail_details   -> summary of a trail, plus its data as structured content
//   - the resource trail://{trailId}   -> the whole trail as GeoJSON (with the route)
//   - the prompt   plan_hike           -> asks the model to prepare a hike on a trail
// The data comes from GET /api/trails/:id, through the backend client.
// As in the search tools, the description written by users never reaches the model:
// text inside a trail must not be able to give instructions to the assistant.
import * as z from 'zod/v4';
import { ResourceTemplate, ResourceNotFoundError } from '@modelcontextprotocol/server';
import { UUID_RE } from '../middlewares/validateTrailQuery.js';
import { textResult, errorResult } from './toolResults.js';

export const TRAIL_URI_TEMPLATE = 'trail://{trailId}';

export const trailUri = (id) => `trail://${id}`;

// Same check as the API (validateTrailId): the model gets a clear message before any request
const trailIdSchema = z
  .string()
  .regex(UUID_RE, 'Invalid trail id: use the id given by the search tools')
  .describe('Id of the trail, from the search tools');

// 12345 -> "12.35 km"
function formatKm(meters) {
  return `${(meters / 1000).toFixed(2)} km`;
}

// 90 -> "1 h 30 min", 45 -> "45 min"
function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const min = Math.round(minutes % 60);
  if (h === 0) return `${min} min`;
  return min === 0 ? `${h} h` : `${h} h ${min} min`;
}

// Number of points of the route (LineString or MultiLineString), 0 if there is only the start point
function countRoutePoints(geometry) {
  if (geometry?.type === 'LineString') return geometry.coordinates.length;
  if (geometry?.type === 'MultiLineString') {
    return geometry.coordinates.reduce((sum, line) => sum + line.length, 0);
  }
  return 0;
}

// Data of the trail for the model: the properties of the API, without the (long) route
// and without the description written by users
export function toTrailDetails(trail) {
  const p = trail.properties ?? {};
  return {
    id: p.id ?? trail.id,
    name: p.name,
    trailType: p.trailType ?? null,
    difficulty: p.difficulty ?? null,
    lengthM: p.lengthM ?? null,
    ascentM: p.ascentM ?? null,
    descentM: p.descentM ?? null,
    maxElevationM: p.maxElevationM ?? null,
    estDurationMin: p.estDurationMin ?? null,
    startPoint: p.startPoint ?? null,
    routePoints: countRoutePoints(trail.geometry),
    resourceUri: trailUri(p.id ?? trail.id),
  };
}

// Text summary of the trail: only the lines the trail really has data for
export function formatTrailSummary(details) {
  const lines = [
    `${details.name} (id: ${details.id})`,
    details.trailType && `Type: ${details.trailType}`,
    details.difficulty && `Difficulty: ${details.difficulty}`,
    details.lengthM != null && `Distance: ${formatKm(details.lengthM)}`,
    details.estDurationMin != null && `Estimated time: ${formatDuration(details.estDurationMin)}`,
    details.ascentM != null && `Ascent: ${Math.round(details.ascentM)} m`,
    details.descentM != null && `Descent: ${Math.round(details.descentM)} m`,
    details.maxElevationM != null && `Highest point: ${Math.round(details.maxElevationM)} m`,
    details.startPoint && `Start point (lng, lat): ${details.startPoint.join(', ')}`,
    `Full route (GeoJSON): resource ${details.resourceUri}`,
  ];
  return lines.filter(Boolean).join('\n');
}

// The trail as GeoJSON for the resource: everything except the description written by users
export function withoutDescription(trail) {
  const { description: _description, ...properties } = trail.properties ?? {};
  return { ...trail, properties };
}

const notFoundText = (id) => `No trail found with id ${id}`;

// register(server, backend): the contract of every MCP module (see server.js)
export function registerTrailDetails(server, backend) {
  // Tool: details of one trail
  server.registerTool(
    'get_trail_details',
    {
      title: 'Trail details',
      description:
        'Returns the details of one hiking trail: distance, estimated time, ascent, descent, ' +
        'highest point, difficulty, type and start point. ' +
        'The full route is available in the resource trail://{trailId}.',
      inputSchema: z.object({ trail_id: trailIdSchema }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ trail_id }) => {
      try {
        const trail = await backend.getTrail(trail_id);
        if (!trail) return { isError: true, content: [{ type: 'text', text: notFoundText(trail_id) }] };
        const details = toTrailDetails(trail);
        return textResult(formatTrailSummary(details), details);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // Resource: the whole trail as GeoJSON Feature (geometry = route).
  // list is undefined: the trails are too many to list, they are found with the search.
  server.registerResource(
    'trail',
    new ResourceTemplate(TRAIL_URI_TEMPLATE, { list: undefined }),
    {
      title: 'Trail (GeoJSON)',
      description:
        'A hiking trail as a GeoJSON Feature: the geometry is the full route, the properties are its data ' +
        '(without the description written by users).',
      mimeType: 'application/geo+json',
    },
    async (uri, { trailId }) => {
      // An invalid id cannot exist: same answer as a missing trail
      if (!UUID_RE.test(trailId)) throw new ResourceNotFoundError(uri.href, notFoundText(trailId));
      const trail = await backend.getTrail(trailId);
      if (!trail) throw new ResourceNotFoundError(uri.href, notFoundText(trailId));
      return {
        contents: [{ uri: uri.href, mimeType: 'application/geo+json', text: JSON.stringify(withoutDescription(trail)) }],
      };
    },
  );

  // Prompt: prepares a hike on a trail, starting from its details
  server.registerPrompt(
    'plan_hike',
    {
      title: 'Plan a hike',
      description: 'Prepares a hike on a trail of the site: timing, gear and things to watch out for.',
      argsSchema: z.object({
        trail_id: trailIdSchema,
        experience: z
          .string()
          .optional()
          .describe('Experience of the hiker, e.g. "beginner" or "expert" (optional)'),
      }),
    },
    async ({ trail_id, experience }) => {
      const trail = await backend.getTrail(trail_id);
      if (!trail) throw new Error(notFoundText(trail_id));
      const details = toTrailDetails(trail);

      const intro = experience
        ? `Help me plan a hike on this trail. The hiker's experience: ${experience}.`
        : 'Help me plan a hike on this trail.';
      const text = [
        intro,
        formatTrailSummary(details),
        'Please tell me: whether the trail suits the hiker, how long to plan for (including breaks), ' +
          'what to bring, and what to watch out for. Use only the data above; if something is missing, say so.',
      ].join('\n\n');

      return { messages: [{ role: 'user', content: { type: 'text', text } }] };
    },
  );
}
