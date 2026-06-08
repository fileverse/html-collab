import { avatarColor, initials } from './format'

/** Round initials avatar — deterministic color from the name. */
export default function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-medium text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: avatarColor(name),
        fontSize: Math.round(size * 0.42),
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
