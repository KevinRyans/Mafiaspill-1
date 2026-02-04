export default function PageHeader({
  title,
  subtitle,
  description,
  banner
}: {
  title: string
  subtitle: string
  description?: string
  banner?: string
}) {
  return (
    <div className="mb-6">
      {banner ? <img src={banner} className="mb-4 h-28 w-full rounded-2xl object-cover" /> : null}
      <p className="text-xs uppercase tracking-[0.3em] text-mist/60">{subtitle}</p>
      <h2 className="mt-2 text-3xl font-bold text-white">{title}</h2>
      {description ? <p className="mt-2 text-sm text-mist/70">{description}</p> : null}
    </div>
  )
}
