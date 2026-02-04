import { ReactNode } from "react"

export default function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
  className = ""
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`rounded-xl bg-neon/20 px-4 py-2 text-sm font-semibold text-neon transition-all duration-150 hover:-translate-y-0.5 hover:bg-neon/30 hover:shadow-glow active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {loading ? "Laster..." : children}
    </button>
  )
}
