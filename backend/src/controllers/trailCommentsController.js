import { supabase, supabaseAsUser } from '../config/supabase.js';
import { UUID_RE } from '../middlewares/validateTrailQuery.js';

const PAGE_SIZE = 20;
const MAX_COMMENT_LENGTH = 2000;
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
const TRAIL_NOT_FOUND = { error: 'Trail not found' };
const INVALID_CURSOR = { error: 'Invalid comments cursor' };

function toComment(row) {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    authorName: row.author_name,
    authorUsername: row.author_username,
    isMine: row.is_mine === true,
  };
}

export async function getTrailComments(req, res) {
  const { beforeAt, beforeId } = req.query;
  const hasCursor = beforeAt !== undefined || beforeId !== undefined;
  if (hasCursor && (
    typeof beforeAt !== 'string' || !TIMESTAMP_RE.test(beforeAt) || !Number.isFinite(Date.parse(beforeAt))
    || typeof beforeId !== 'string' || !UUID_RE.test(beforeId)
  )) {
    return res.status(400).json(INVALID_CURSOR);
  }

  const db = req.token ? supabaseAsUser(req.token) : supabase;
  const { data, error } = await db.rpc('get_trail_comments', {
    p_trail_id: req.params.id,
    p_before_at: beforeAt ?? null,
    p_before_id: beforeId ?? null,
    p_limit: PAGE_SIZE + 1,
  });
  if (hasCursor && error?.code === '22008') return res.status(400).json(INVALID_CURSOR);
  if (error) throw error;

  const [page] = data ?? [];
  if (!page) return res.status(404).json(TRAIL_NOT_FOUND);

  const comments = page.comments.slice(0, PAGE_SIZE).map(toComment);
  const last = comments.at(-1);
  const nextCursor = page.comments.length > PAGE_SIZE
    ? { id: last.id, createdAt: last.createdAt }
    : null;
  return res.vary('Authorization').set('Cache-Control', 'no-store').json({ comments, nextCursor });
}

export async function postTrailComment(req, res) {
  if (req.user.is_anonymous) return res.status(403).json({ error: 'Log in to post a comment' });

  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (!body || body.includes('\0') || [...body].length > MAX_COMMENT_LENGTH) {
    return res.status(400).json({ error: 'Enter a comment between 1 and 2,000 characters.' });
  }

  const { error } = await supabaseAsUser(req.token)
    .from('trail_comments')
    .insert({ trail_id: req.params.id, body });
  if (error?.code === '23503') return res.status(404).json(TRAIL_NOT_FOUND);
  if (error) throw error;

  return res.status(201).end();
}

export async function deleteTrailComment(req, res) {
  const { id: trailId, commentId } = req.params;
  if (!UUID_RE.test(commentId)) {
    return res.status(400).json({ error: 'Invalid comment id' });
  }

  const { error } = await supabaseAsUser(req.token)
    .from('trail_comments')
    .delete()
    .eq('trail_id', trailId)
    .eq('id', commentId);
  if (error) throw error;

  // RLS limits deletion to the author. Retrying a deletion also succeeds.
  return res.status(204).end();
}
