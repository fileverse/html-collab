import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import TopBar from '@/components/TopBar'
import Preview from '@/features/preview/Preview'
import CommentDrawer from '@/features/comments/CommentDrawer'
import { useLocalComments, useRemoteComments } from '@/features/comments/controllers'
import { useDocStore } from '@/store/useDocStore'
import { useShareStore } from '@/store/useShareStore'
import { downloadFeedbackFile } from '@/features/export/exportDoc'
import SharePopover from '@/features/share/SharePopover'
import { SAMPLES } from '@/features/preview/samples'

export default function Editor() {
  const html = useDocStore((s) => s.html)
  const fileName = useDocStore((s) => s.fileName)
  const setDoc = useDocStore((s) => s.setDoc)
  const [params] = useSearchParams()
  const sampleId = params.get('sample')
  const navigate = useNavigate()

  const docId = fileName ?? 'imported.html'

  // Once a doc is shared, its comments live in Supabase (single source of truth)
  // so guest feedback syncs back here. Both hooks are called unconditionally;
  // the remote one is inert until there's a shareId.
  const share = useShareStore((s) => s.byDoc[docId])
  const setShare = useShareStore((s) => s.setShare)
  const local = useLocalComments(docId)
  const remote = useRemoteComments(share?.shareId ?? null, share?.password ?? '', {
    owner: true,
    author: 'You',
  })
  const ctrl = share ? remote : local
  const comments = ctrl.comments

  const [drawerOpen, setDrawerOpen] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)

  // Dev convenience: /editor?sample=landing loads a sample straight into the store.
  useEffect(() => {
    if (html || !sampleId) return
    const sample = SAMPLES.find((s) => s.id === sampleId)
    if (sample) setDoc(sample.html, `${sample.name}.html`)
  }, [html, sampleId, setDoc])

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
        <div className="absolute right-5 top-[68px] z-30">
          <SharePopover
            fileName={docId}
            html={html}
            comments={comments.map((c) => ({
              author: c.author,
              anchor: c.anchor,
              offset: c.offset,
              body: c.body,
              resolved: c.resolved,
            }))}
            existingShareId={share?.shareId}
            existingHasPassword={Boolean(share?.password)}
            onShared={(shareId, password) =>
              setShare(docId, { shareId, password, createdAt: Date.now() })
            }
            onClose={() => setShareOpen(false)}
          />
        </div>
      )}
      <div className="mx-auto flex h-screen max-w-7xl flex-col px-6 pb-6 pt-[72px]">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700">
            {docId}
          </span>
          {ctrl.isRemote ? (
            <button
              type="button"
              onClick={() => ctrl.refresh?.()}
              title="Refresh feedback from the shared link"
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50"
            >
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Shared{ctrl.loading ? ' · syncing…' : ' · refresh'}
            </button>
          ) : (
            <span className="text-xs text-neutral-400">v1 · just now</span>
          )}
        </div>
        <div className="flex flex-1 gap-3 overflow-hidden">
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <Preview
            key={docId}
            html={html}
            comments={comments}
            activeId={activeId}
            mode={drawerOpen ? 'comment' : 'view'}
            onSelect={(id) => {
              setActiveId(id)
              if (id) setDrawerOpen(true)
            }}
            onCreate={async (draft) => {
              const c = await ctrl.add(draft)
              if (c) setActiveId(c.id)
              setDrawerOpen(true)
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
    </div>
  )
}
