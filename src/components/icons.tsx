import type { ReactNode } from 'react'

type IconProps = { size?: number; className?: string }

function Icon({ size = 20, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function UploadIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M12 4v12" />
    </Icon>
  )
}

export function CommentIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Icon>
  )
}

export function ShareIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </Icon>
  )
}

export function DownloadIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </Icon>
  )
}

export function HelpIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </Icon>
  )
}

// ---------------------------------------------------------------------------
// Fill-based icons traced directly from the Figma design system (exact path
// data). `currentColor` so they inherit text color; sized via viewBox.
// ---------------------------------------------------------------------------

/** Close / x (Figma node 29:2344). */
export function CloseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 9.33333 9.33333" fill="none" aria-hidden="true">
      <path
        d="M9.13807 1.13807C9.39842 0.877722 9.39842 0.455612 9.13807 0.195262C8.87772 -0.0650874 8.45561 -0.0650874 8.19526 0.195262L4.66667 3.72386L1.13807 0.195262C0.877722 -0.0650874 0.455612 -0.0650874 0.195262 0.195262C-0.0650874 0.455612 -0.0650874 0.877722 0.195262 1.13807L3.72386 4.66667L0.195262 8.19526C-0.0650874 8.45561 -0.0650874 8.87772 0.195262 9.13807C0.455612 9.39842 0.877722 9.39842 1.13807 9.13807L4.66667 5.60948L8.19526 9.13807C8.45561 9.39842 8.87772 9.39842 9.13807 9.13807C9.39842 8.87772 9.39842 8.45561 9.13807 8.19526L5.60948 4.66667L9.13807 1.13807Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** Resolve / check (Figma card action). */
export function ResolveIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 8.66667" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.8047 0.195262C12.0651 0.455612 12.0651 0.877722 11.8047 1.13807L4.4714 8.4714C4.21106 8.73175 3.78895 8.73175 3.5286 8.4714L0.195262 5.13807C-0.0650874 4.87772 -0.0650874 4.45561 0.195262 4.19526C0.455612 3.93491 0.877722 3.93491 1.13807 4.19526L4 7.05719L10.8619 0.195262C11.1223 -0.0650874 11.5444 -0.0650874 11.8047 0.195262Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** More / vertical kebab (Figma card action). */
export function MoreIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 2.66602 12" fill="none" aria-hidden="true">
      <path
        d="M1.33301 9.33301C2.06939 9.33301 2.66602 9.93061 2.66602 10.667C2.66584 11.4032 2.06928 12 1.33301 12C0.596737 12 0.000176117 11.4032 0 10.667C3.21882e-08 9.93061 0.596628 9.33301 1.33301 9.33301ZM1.33301 4.66699C2.06939 4.66699 2.66602 5.26362 2.66602 6C2.66602 6.73638 2.06939 7.33301 1.33301 7.33301C0.596628 7.33301 -3.21882e-08 6.73638 0 6C1.62509e-07 5.26362 0.596628 4.66699 1.33301 4.66699ZM1.33301 0C2.06928 9.66e-08 2.66584 0.596778 2.66602 1.33301C2.66602 2.06939 2.06939 2.66699 1.33301 2.66699C0.596628 2.66699 -3.21882e-08 2.06939 0 1.33301C0.000175926 0.596778 0.596737 -3.21834e-08 1.33301 0Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** Verified / ENS seal badge (Figma ens-sign). Self-colored brand blue. */
export function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.76891 0.220314C7.29839 -0.0734379 6.70161 -0.0734378 6.23109 0.220314L4.81636 1.10354C4.68024 1.18851 4.53098 1.25034 4.37464 1.2865L2.74974 1.66233C2.20932 1.78733 1.78733 2.20932 1.66233 2.74974L1.2865 4.37464C1.25034 4.53098 1.18851 4.68024 1.10354 4.81636L0.220314 6.23109C-0.0734379 6.70161 -0.0734378 7.29839 0.220314 7.76891L1.10354 9.18364C1.18851 9.31976 1.25034 9.46903 1.2865 9.62537L1.66233 11.2503C1.78733 11.7907 2.20932 12.2127 2.74974 12.3377L4.37464 12.7135C4.53098 12.7497 4.68024 12.8115 4.81636 12.8965L6.23109 13.7797C6.70161 14.0734 7.29839 14.0734 7.76891 13.7797L9.18364 12.8965C9.31976 12.8115 9.46903 12.7497 9.62537 12.7135L11.2503 12.3377C11.7907 12.2127 12.2127 11.7907 12.3377 11.2503L12.7135 9.62536C12.7497 9.46902 12.8115 9.31976 12.8965 9.18364L13.7797 7.76891C14.0734 7.29839 14.0734 6.70161 13.7797 6.23109L12.8965 4.81636C12.8115 4.68024 12.7497 4.53098 12.7135 4.37464L12.3377 2.74974C12.2127 2.20932 11.7907 1.78733 11.2503 1.66233L9.62537 1.2865C9.46903 1.25034 9.31976 1.18851 9.18364 1.10354L7.76891 0.220314ZM9.45472 4.37291C9.70279 4.12484 10.105 4.12484 10.3531 4.37291C10.6011 4.62098 10.6011 5.02318 10.3531 5.27126L6.36021 9.2641C6.11214 9.51218 5.70994 9.51218 5.46187 9.2641L3.64694 7.44917C3.39887 7.2011 3.39887 6.7989 3.64694 6.55083C3.89501 6.30276 4.29721 6.30276 4.54528 6.55083L5.91104 7.91659L9.45472 4.37291Z"
        fill="#4A99E9"
      />
    </svg>
  )
}

/** Trash / delete (stroke). */
export function TrashIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </Icon>
  )
}

/** Brand badge — yellow rounded square with a stacked-pages glyph. */
export function Logo({ size = 36 }: { size?: number }) {
  const glyph = Math.round(size * 0.5)
  return (
    <div
      className="grid place-items-center rounded-[10px] bg-brand shadow-sm"
      style={{ width: size, height: size }}
    >
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#171717"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2 2 7l10 5 10-5-10-5Z" />
        <path d="m2 17 10 5 10-5" />
        <path d="m2 12 10 5 10-5" />
      </svg>
    </div>
  )
}
