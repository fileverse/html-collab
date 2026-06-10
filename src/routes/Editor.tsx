import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import TopBar from '@/components/TopBar'
import { TrashFillIcon } from '@/components/icons'
import Preview from '@/features/preview/Preview'
import CommentDrawer from '@/features/comments/CommentDrawer'
import { useLocalComments, useRemoteComments } from '@/features/comments/controllers'
import { useCommentStore } from '@/store/useCommentStore'
import { useDocStore } from '@/store/useDocStore'
import { useShareStore } from '@/store/useShareStore'
import { copyReprompt, downloadFeedbackFile } from '@/features/export/exportDoc'
import SharePopover, { ConfirmDialog } from '@/features/share/SharePopover'
import { createShare, deleteShare, setSharePassword } from '@/features/share/api'
import { isSupabaseConfigured } from '@/lib/supabase'
import { loadSampleHtml, sampleFileName } from '@/features/preview/samples'

/** DD.MM.YYYY (Figma title pill). */
function formatDate(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

export default function Editor() {
  const html = useDocStore((s) => s.html)
  const fileName = useDocStore((s) => s.fileName)
  const setDoc = useDocStore((s) => s.setDoc)
  const resetDoc = useDocStore((s) => s.reset)
  const clearDocComments = useCommentStore((s) => s.clearDoc)
  const [params] = useSearchParams()
  const sampleId = params.get('sample')
  const navigate = useNavigate()

  const docId = fileName ?? 'imported.html'

  // Once a doc is shared, its comments live in Supabase (single source of truth)
  // so guest feedback syncs back here. Both hooks are called unconditionally;
  // the remote one is inert until there's a shareId.
  const share = useShareStore((s) => s.byDoc[docId])
  const setShare = useShareStore((s) => s.setShare)
  const clearShare = useShareStore((s) => s.clearShare)
  const local = useLocalComments(docId)
  const remote = useRemoteComments(share?.shareId ?? null, share?.password ?? '', {
    owner: true,
    author: 'You',
  })
  const ctrl = share ? remote : local
  const comments = ctrl.comments

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  // Figma: the share card is open by default right after import.
  const [shareOpen, setShareOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Dev convenience: /editor?sample=<id> fetches a sample into the store.
  useEffect(() => {
    if (html || !sampleId) return
    let cancelled = false
    loadSampleHtml(sampleId)
      .then((h) => {
        if (!cancelled) setDoc(h, sampleFileName(sampleId))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [html, sampleId, setDoc])

  // Figma: the share link exists as soon as a file is imported. Auto-create a
  // (password-less) share for any doc that doesn't have one yet, migrating any
  // local comments into it so nothing is lost.
  const creatingRef = useRef(false)
  useEffect(() => {
    if (!html || share || !isSupabaseConfigured || creatingRef.current) return
    creatingRef.current = true
    const localComments = local.comments.map((c) => ({
      author: c.author,
      anchor: c.anchor,
      offset: c.offset,
      body: c.body,
      resolved: c.resolved,
    }))
    createShare({ fileName: docId, html, password: '', comments: localComments })
      .then(({ id, ownerToken }) => {
        setShare(docId, { shareId: id, password: '', ownerToken, createdAt: Date.now() })
        if (localComments.length > 0) clearDocComments(docId) // migrated to the share
      })
      .catch(() => {
        /* offline / misconfigured — local-only mode still works */
      })
      .finally(() => {
        creatingRef.current = false
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, docId, share])

  async function applyPassword(newPassword: string): Promise<boolean> {
    if (!share?.ownerToken) return false
    try {
      await setSharePassword(share.shareId, share.ownerToken, newPassword)
      setShare(docId, { ...share, password: newPassword })
      return true
    } catch {
      return false
    }
  }

  async function deleteFile() {
    setDeleting(true)
    try {
      if (share?.ownerToken) await deleteShare(share.shareId, share.ownerToken)
    } catch {
      /* link may already be gone — still clear locally */
    }
    clearShare(docId)
    clearDocComments(docId)
    resetDoc()
    setDeleting(false)
    navigate('/')
  }

  if (!html) {
    if (sampleId) return null // sample loads on the next tick
    return <Navigate to="/" replace />
  }

  return (
    <div className="relative min-h-screen bg-dotgrid">
      <TopBar
        commentCount={comments.length}
        commentsOpen={drawerOpen}
        onToggleComments={() => setDrawerOpen((o) => !o)}
        onDownload={() => downloadFeedbackFile(html, docId, comments)}
        onShare={() => setShareOpen((o) => !o)}
        shareOpen={shareOpen}
        onUpload={() => navigate('/')}
      />
      {shareOpen && (
        <div className="pointer-events-none absolute inset-x-0 bottom-12 z-30 flex justify-center">
          <div className="pointer-events-auto animate-slide-up">
          <SharePopover
            fileName={docId}
            shareId={share?.shareId ?? null}
            hasPassword={Boolean(share?.password)}
            onSetPassword={applyPassword}
            onClose={() => setShareOpen(false)}
          />
          </div>
        </div>
      )}
      <div className="mx-auto flex h-screen max-w-7xl flex-col px-6 pb-6 pt-[72px]">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700">
            {docId}
          </span>
          {/* Figma title pill: v1 · DD.MM.YYYY · N comments · delete */}
          <span className="flex items-center gap-2 rounded-full bg-line px-3 py-1">
            <span className="text-xs font-medium leading-4 text-ink">v1</span>
            <span className="text-xs leading-4 text-muted">
              {formatDate(share?.createdAt ?? Date.now())}
            </span>
            <span className="text-xs leading-4 text-muted">
              {comments.length} comment{comments.length === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              title="Delete this file and its share link"
              onClick={() => setConfirmDelete(true)}
              className="grid size-6 place-items-center rounded text-[#FB3449] transition hover:bg-red-50"
            >
              <TrashFillIcon size={14} />
            </button>
          </span>
          {ctrl.isRemote && (
            <button
              type="button"
              onClick={() => ctrl.refresh?.()}
              title="Refresh feedback from the shared link"
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50"
            >
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Shared{ctrl.loading ? ' · syncing…' : ' · refresh'}
            </button>
          )}
          {comments.length > 0 && (
            <button
              type="button"
              title="Copy the feedback as a re-prompt for your AI agent"
              onClick={async () => {
                if (await copyReprompt(comments)) {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }
              }}
              className="ml-auto rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              {copied ? 'Copied!' : 'Copy re-prompt'}
            </button>
          )}
        </div>
        <div className="flex flex-1 gap-3 overflow-hidden">
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <Preview
            key={docId}
            html={html}
            comments={comments}
            activeId={activeId}
            mode="comment"
            onSelect={setActiveId}
            onResolve={ctrl.resolve}
            onDelete={
              ctrl.remove
                ? (id) => {
                    ctrl.remove?.(id)
                    setActiveId((cur) => (cur === id ? null : cur))
                  }
                : undefined
            }
            onCreate={async (draft) => {
              const c = await ctrl.add(draft)
              if (c) setActiveId(c.id)
            }}
          />
          </div>
          {drawerOpen && (
            <div className="h-full shrink-0">
              <CommentDrawer
                comments={comments}
                activeId={activeId}
                onSelect={setActiveId}
                onClose={() => setDrawerOpen(false)}
                onResolve={ctrl.resolve}
                onDelete={
                  ctrl.remove
                    ? (id) => {
                        ctrl.remove?.(id)
                        setActiveId((cur) => (cur === id ? null : cur))
                      }
                    : undefined
                }
              />
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this file"
          body="You are about to delete the imported file, its share link, and all comments. Reviewers with the link will lose access. This cannot be undone."
          confirmLabel={deleting ? 'Deleting…' : 'Yes, delete'}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void deleteFile()}
        />
      )}
    </div>
  )
}
