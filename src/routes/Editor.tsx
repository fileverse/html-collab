import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import TopBar from '@/components/TopBar'
import { TrashFillIcon, UploadIcon } from '@/components/icons'
import Preview from '@/features/preview/Preview'
import CommentDrawer from '@/features/comments/CommentDrawer'
import VersionRail from '@/features/versions/VersionRail'
import ImportingState from '@/features/import/ImportingState'
import { HTML_ACCEPT, isHtmlFile, readFileAsText } from '@/features/import/readHtmlFile'
import { useLocalComments, useRemoteComments } from '@/features/comments/controllers'
import { useCommentStore } from '@/store/useCommentStore'
import { useDocStore } from '@/store/useDocStore'
import { useShareStore, type VersionMeta } from '@/store/useShareStore'
import { copyReprompt, downloadFeedbackFile } from '@/features/export/exportDoc'
import SharePopover, { ConfirmDialog } from '@/features/share/SharePopover'
import {
  addVersion,
  createShare,
  deleteVersion,
  fetchShare,
  setSharePassword,
} from '@/features/share/api'
import { isSupabaseConfigured } from '@/lib/supabase'
import { loadSampleHtml, sampleFileName } from '@/features/preview/samples'

const MAX_VERSIONS = 3

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
  const setHtml = useDocStore((s) => s.setHtml)
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
  const patchShare = useShareStore((s) => s.patchShare)
  const clearShare = useShareStore((s) => s.clearShare)

  const activeVersion = share?.activeVersion ?? 1
  const versions = share?.versions ?? []
  const latestVersion = versions.reduce((m, v) => Math.max(m, v.no), activeVersion)

  const local = useLocalComments(docId)
  const remote = useRemoteComments(share?.shareId ?? null, share?.password ?? '', activeVersion, {
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
  const [uploading, setUploading] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const versionInputRef = useRef<HTMLInputElement>(null)

  function flashHint(msg: string) {
    setHint(msg)
    setTimeout(() => setHint((h) => (h === msg ? null : h)), 2600)
  }

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
  // (password-less) share + version 1 for any doc that doesn't have one yet,
  // migrating any local comments into it so nothing is lost.
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
        const now = Date.now()
        setShare(docId, {
          shareId: id,
          password: '',
          ownerToken,
          createdAt: now,
          versions: [{ no: 1, fileName: docId, createdAt: now }],
          activeVersion: 1,
        })
        if (localComments.length > 0) clearDocComments(docId) // migrated to the share
      })
      .catch(() => {
        /* offline / misconfigured — local-only mode still works (no versioning) */
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
      patchShare(docId, { password: newPassword })
      return true
    } catch {
      return false
    }
  }

  // "Import new version of this file" (Figma in-canvas button) → file picker.
  function importNewVersion() {
    if (!share) return
    if (versions.length >= MAX_VERSIONS) {
      flashHint(`Max ${MAX_VERSIONS} versions — delete one to add another.`)
      return
    }
    versionInputRef.current?.click()
  }

  async function onVersionFile(file: File) {
    if (!share) return
    if (!isHtmlFile(file)) {
      flashHint('Please choose an .html file.')
      return
    }
    setUploading(true)
    try {
      const nextHtml = await readFileAsText(file)
      const no = await addVersion({
        shareId: share.shareId,
        ownerToken: share.ownerToken,
        fileName: file.name,
        html: nextHtml,
      })
      const v: VersionMeta = { no, fileName: file.name, createdAt: Date.now() }
      patchShare(docId, { versions: [...versions, v], activeVersion: no })
      setHtml(nextHtml) // project name stays stable; show the new version
      setActiveId(null)
      setShareOpen(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      flashHint(
        msg.includes('max_versions') ? `Max ${MAX_VERSIONS} versions reached.` : 'Upload failed.',
      )
    } finally {
      setUploading(false)
    }
  }

  async function switchVersion(no: number) {
    if (!share || no === activeVersion || switching) return
    setSwitching(true)
    setActiveId(null)
    try {
      const d = await fetchShare(share.shareId, share.password, no)
      setHtml(d.html)
      patchShare(docId, { activeVersion: no })
    } catch {
      flashHint('Could not load that version.')
    } finally {
      setSwitching(false)
    }
  }

  async function deleteActiveVersion() {
    if (!share) return
    setDeleting(true)
    try {
      const { shareDeleted } = await deleteVersion(share.shareId, share.ownerToken, activeVersion)
      if (shareDeleted) {
        clearShare(docId)
        clearDocComments(docId)
        resetDoc()
        navigate('/')
        return
      }
      // versions were renumbered server-side — refetch the new latest + list
      const d = await fetchShare(share.shareId, share.password)
      patchShare(docId, {
        versions: d.versions.map((x) => ({
          no: x.version_no,
          fileName: x.file_name,
          createdAt: Date.parse(x.created_at) || Date.now(),
        })),
        activeVersion: d.version_no,
      })
      setHtml(d.html)
      setActiveId(null)
    } catch {
      flashHint('Could not delete that version.')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (!html) {
    if (sampleId) return null // sample loads on the next tick
    return <Navigate to="/" replace />
  }

  if (uploading) return <ImportingState label="Uploading updated version" />

  const activeMeta = versions.find((v) => v.no === activeVersion)
  const isLatest = activeVersion === latestVersion
  const lastVersion = versions.length <= 1

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
        onLogoClick={() => navigate('/')}
      />
      {/* Version switcher lives in the left page margin, outside the canvas (Figma) */}
      <VersionRail
        versions={versions.map((v) => v.no)}
        active={activeVersion}
        onSelect={(no) => void switchVersion(no)}
      />
      <input
        ref={versionInputRef}
        type="file"
        accept={HTML_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onVersionFile(f)
          e.target.value = ''
        }}
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
          {/* Figma title pill: vN · DD.MM.YYYY · N comments · delete */}
          <span className="flex items-center gap-2 rounded-full bg-line px-3 py-1">
            <span className="text-xs font-medium leading-4 text-ink">v{activeVersion}</span>
            <span className="text-xs leading-4 text-muted">
              {formatDate(activeMeta?.createdAt ?? share?.createdAt ?? Date.now())}
            </span>
            <span className="text-xs leading-4 text-muted">
              {comments.length} comment{comments.length === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              title={
                lastVersion ? 'Delete this file and its share link' : `Delete version v${activeVersion}`
              }
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
              Shared{ctrl.loading || switching ? ' · syncing…' : ' · refresh'}
            </button>
          )}
          {hint && <span className="text-xs font-medium text-amber-600">{hint}</span>}
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
              key={`${docId}:v${activeVersion}`}
              html={html}
              comments={comments}
              activeId={activeId}
              mode={isLatest ? 'comment' : 'view'}
              onSelect={setActiveId}
              onResolve={isLatest ? ctrl.resolve : undefined}
              onDelete={
                isLatest && ctrl.remove
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
            {/* Figma: in-canvas button to import the next version */}
            {share && isLatest && !shareOpen && (
              <button
                type="button"
                onClick={importNewVersion}
                title={
                  versions.length >= MAX_VERSIONS
                    ? `Max ${MAX_VERSIONS} versions — delete one to add another`
                    : 'Import a revised version of this file'
                }
                className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink shadow-[0px_4px_12px_0px_rgba(0,0,0,0.15)] transition hover:bg-neutral-50"
              >
                <UploadIcon size={16} />
                Import new version of this file
              </button>
            )}
            {!isLatest && (
              <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-ink/85 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
                Viewing v{activeVersion} (read-only) · comment on v{latestVersion}
              </div>
            )}
          </div>
          {drawerOpen && (
            <div className="h-full shrink-0">
              <CommentDrawer
                comments={comments}
                activeId={activeId}
                onSelect={setActiveId}
                onClose={() => setDrawerOpen(false)}
                onResolve={isLatest ? ctrl.resolve : undefined}
                onDelete={
                  isLatest && ctrl.remove
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
          title={lastVersion ? 'Delete this file' : `Delete version v${activeVersion}`}
          body={
            lastVersion
              ? 'You are about to delete the imported file, its share link, and all comments. Reviewers with the link will lose access. This cannot be undone.'
              : `You are about to delete version v${activeVersion} and all of its comments. Other versions are kept. This cannot be undone.`
          }
          confirmLabel={deleting ? 'Deleting…' : 'Yes, delete'}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void deleteActiveVersion()}
        />
      )}
    </div>
  )
}
