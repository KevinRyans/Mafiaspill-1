import banner from "../assets/banner-ops.svg"
import ActionCategory from "./ActionCategory"

export default function OrganizedCrime() {
  return (
    <ActionCategory
      category="organisert"
      title="Organisert krim"
      subtitle="Flere steg"
      description="Større, fiktive operasjoner som tar mer tid."
      banner={banner}
      actionLabel="Start"
    />
  )
}
