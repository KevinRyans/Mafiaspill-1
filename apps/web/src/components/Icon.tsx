import {
  Sparkles,
  ShoppingBag,
  Users,
  Shield,
  Signal,
  AlertTriangle,
  CheckCircle,
  Swords,
  Wallet,
  Timer,
  Network,
  GalleryHorizontal,
  BadgeCheck,
  Bell,
  Mail,
  MapPin,
  Dice5,
  Skull,
  Car
} from "lucide-react"

const iconMap = {
  spark: Sparkles,
  market: ShoppingBag,
  crew: Users,
  shield: Shield,
  signal: Signal,
  warning: AlertTriangle,
  check: CheckCircle,
  sword: Swords,
  wallet: Wallet,
  timer: Timer,
  network: Network,
  art: GalleryHorizontal,
  badge: BadgeCheck,
  bell: Bell,
  inbox: Mail,
  travel: MapPin,
  gambling: Dice5,
  darknet: Skull,
  car: Car
}

export type IconName = keyof typeof iconMap

export default function Icon({ name, className }: { name: IconName; className?: string }) {
  const Component = iconMap[name]
  return <Component className={className || "h-4 w-4"} />
}
