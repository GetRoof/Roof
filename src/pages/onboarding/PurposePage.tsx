import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingLayout from '../../components/layout/OnboardingLayout'
import CheckOption from '../../components/ui/CheckOption'
import Button from '../../components/ui/Button'
import { useOnboarding } from '../../context/OnboardingContext'

const purposes = [
  {
    id: 'find_room',
    label: 'Find a room or apartment',
    description: 'Browse listings from Pararius, Kamernet, Funda & more',
  },
  {
    id: 'find_roommate',
    label: 'Find someone looking for a roommate',
    description: 'You want to join people on a space',
  },
  {
    id: 'share_space',
    label: 'Find a roommate for my current rent',
    description: 'You want to rent a space from your place',
  },
  {
    id: 'new_place',
    label: 'Find someone to share a new place',
    description: 'We help you and a roommate find a new place',
  },
]

export default function PurposePage() {
  const navigate = useNavigate()
  const { data, setData } = useOnboarding()
  const [selected, setSelected] = useState<string[]>(data.purposes || [])

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const handleNext = () => {
    if (!selected.length) return
    setData({ purposes: selected })
    navigate('/onboarding/housing-type')
  }

  return (
    <OnboardingLayout currentStep={2} totalSteps={7}>
      <div className="flex flex-col flex-1 px-5">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
            What brings you to Roof?
          </h1>
          <p className="text-[15px] text-muted leading-relaxed">
            Brand new clean and cozy Roof or renting out your space? Choose a mode to find your people.
          </p>
        </div>

        <div className="divide-y divide-neutral-100">
          {purposes.map((p) => (
            <CheckOption
              key={p.id}
              label={p.label}
              description={p.description}
              selected={selected.includes(p.id)}
              onToggle={() => toggle(p.id)}
            />
          ))}
        </div>

        <p className="text-sm text-muted mt-4 leading-relaxed">
          The mode you select makes total difference on what we show you.
        </p>

        <div className="mt-auto pb-8 pt-6">
          <Button onClick={handleNext} disabled={!selected.length}>
            Next
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  )
}
