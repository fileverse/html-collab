import { supabase } from '@/lib/supabase'
import type { Anchor } from '@/features/preview/types'
import type { Comment } from '@/store/useCommentStore'

/** A comment as it lives on a shared doc (server-side ids/timestamps). */
export type ShareComment = {
  id: string
  share_id: string
  author: string
  anchor: Anchor
  offset: { x: number; y: number }
  body: string
  resolved: boolean
  created_at: string
}

/** Local comment shape we push when creating a share. */
export type NewComment = {
  author: string
  anchor: Anchor
  offset: { x: number; y: number }
  body: string
  resolved: boolean
}

export type ShareMeta =
  | { exists: false }
  | { exists: true; requires_password: boolean; file_name: string }

export type ShareDoc = { file_name: string; html: string; comments: ShareComment[] }

function client() {
  if (!supabase) throw new Error('Supabase is not configured (set VITE_SUPABASE_* in .env.local).')
  return supabase
}

/** Normalize Postgres RAISE messages into stable codes for the UI. */
function codeOf(message?: string): 'invalid_password' | 'not_found' | 'unknown' {
  if (message?.includes('invalid_password')) return 'invalid_password'
  if (message?.includes('not_found')) return 'not_found'
  return 'unknown'
}

export async function createShare(input: {
  fileName: string
  html: string
  password: string
  comments: NewComment[]
}): Promise<string> {
  const { data, error } = await client().rpc('create_share', {
    p_file_name: input.fileName,
    p_html: input.html,
    p_password: input.password,
    p_comments: input.comments,
  })
  if (error) throw new Error(error.message)
  return data as string
}

export async function fetchShareMeta(shareId: string): Promise<ShareMeta> {
  const { data, error } = await client().rpc('share_meta', { p_share_id: shareId })
  if (error) throw new Error(error.message)
  return data as ShareMeta
}

export async function fetchShare(shareId: string, password: string): Promise<ShareDoc> {
  const { data, error } = await client().rpc('get_share', {
    p_share_id: shareId,
    p_password: password,
  })
  if (error) {
    const c = codeOf(error.message)
    throw new Error(c)
  }
  return data as ShareDoc
}

export async function addShareComment(input: {
  shareId: string
  password: string
  author: string
  anchor: Anchor
  offset: { x: number; y: number }
  body: string
}): Promise<ShareComment> {
  const { data, error } = await client().rpc('add_comment', {
    p_share_id: input.shareId,
    p_password: input.password,
    p_author: input.author,
    p_anchor: input.anchor,
    p_offset: input.offset,
    p_body: input.body,
  })
  if (error) throw new Error(codeOf(error.message))
  return data as ShareComment
}

/** Lightweight comments-only fetch (for polling); html is not re-sent. */
export async function listShareComments(shareId: string, password: string): Promise<ShareComment[]> {
  const { data, error } = await client().rpc('list_comments', {
    p_share_id: shareId,
    p_password: password,
  })
  if (error) throw new Error(codeOf(error.message))
  return (data ?? []) as ShareComment[]
}

export async function setShareCommentResolved(
  shareId: string,
  password: string,
  commentId: string,
  resolved: boolean,
): Promise<void> {
  const { error } = await client().rpc('set_comment_resolved', {
    p_share_id: shareId,
    p_password: password,
    p_comment_id: commentId,
    p_resolved: resolved,
  })
  if (error) throw new Error(codeOf(error.message))
}

export async function deleteShareComment(
  shareId: string,
  password: string,
  commentId: string,
): Promise<void> {
  const { error } = await client().rpc('delete_comment', {
    p_share_id: shareId,
    p_password: password,
    p_comment_id: commentId,
  })
  if (error) throw new Error(codeOf(error.message))
}

/** Map a server ShareComment into the shape Preview/CommentDrawer expect. */
export function toComment(sc: ShareComment): Comment {
  return {
    id: sc.id,
    docId: sc.share_id,
    author: sc.author,
    anchor: sc.anchor,
    offset: sc.offset,
    body: sc.body,
    createdAt: Date.parse(sc.created_at) || 0,
    resolved: sc.resolved,
  }
}
