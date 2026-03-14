import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingLayout from '../../components/layout/OnboardingLayout'
import Chip from '../../components/ui/Chip'
import Button from '../../components/ui/Button'
import { useOnboarding } from '../../context/OnboardingContext'

const suggested = [
  '🥐 Baking', '🍔 Foodie', '🍷 Wine', '🏳️‍🌈 LGBTQ+', '🐕 Dogs',
  '💃 Dancing', '🥗 Vegetarian', '🧘 Yoga', '✍️ Writing', '🎸 Music',
  '🏃 Running', '🎨 Art', '📚 Reading', '🌿 Plants', '🎬 Films',
  '🚴 Cycling', '🌍 Travel', '☕ Coffee', '🐈 Cats', '🏊 Swimming',
]

export default function InterestsPage() {
  const navigate = useNavigate()
  const { data, setData } = useOnboarding()
  const [selected, setSelected] = useState<string[]>(data.interests || [])

  const toggle = (item: string) => {
    setSelected((prev) =>
      prev.includes(item)
        ? prev.filter((i) => i !== item)
        : prev.length < 10 ? [...prev, item] : prev
    )
  }

  const handleNext = () => {
    setData({ interests: selected })
    navigate('/onboarding/notifications')
  }

  return (
    <OnboardingLayout currentStep={6} totalSteps={7}>
      <div className="flex flex-col flex-1 px-5">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
            Now, let's talk about you!
          </h1>
          <h2 className="text-[17px] font-bold text-foreground mb-1">
            Choose things you're really into
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Add interests to help find listings and people that match your vibe.
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-muted mb-3">You might like…</p>
          <div className="flex flex-wrap gap-2">
            {suggested.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={selected.includes(item)}
                onToggle={() => toggle(item)}
              />
            ))}
          </div>
        </div>

        {selected.length > 0 && (
          <p className="text-xs text-muted mt-3">
            {selected.length}/10 selected
          </p>
        )}

        <div className="mt-auto pb-8 pt-6">
          <Button onClick={handleNext}>
            {selected.length === 0 ? 'Skip for now' : 'Next'}
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  )
}
