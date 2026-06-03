import { useEffect, useMemo, useState } from 'react'

export type TourStep = {
  selector: string
  title: string
  description: string
}

type GuidedTourProps = {
  steps: TourStep[]
  onClose: (completed: boolean) => void
}

type Spotlight = {
  top: number
  left: number
  width: number
  height: number
}

const emptySpotlight: Spotlight = {
  top: 90,
  left: 24,
  width: 280,
  height: 90,
}

export function GuidedTour({ steps, onClose }: GuidedTourProps) {
  const [index, setIndex] = useState(0)
  const [spotlight, setSpotlight] = useState<Spotlight>(emptySpotlight)
  const step = steps[index]

  const tooltipStyle = useMemo(() => {
    const preferRight = spotlight.left + spotlight.width + 340 < window.innerWidth
    const left = preferRight
      ? spotlight.left + spotlight.width + 18
      : Math.max(16, spotlight.left - 338)
    const top = Math.min(
      Math.max(16, spotlight.top),
      Math.max(16, window.innerHeight - 220),
    )

    return {
      left,
      top,
    }
  }, [spotlight])

  useEffect(() => {
    const updateSpotlight = () => {
      const element = document.querySelector(step.selector)

      if (!element) {
        setSpotlight(emptySpotlight)
        return
      }

      const rect = element.getBoundingClientRect()
      const padding = 8
      setSpotlight({
        top: Math.max(8, rect.top - padding),
        left: Math.max(8, rect.left - padding),
        width: Math.min(window.innerWidth - 16, rect.width + padding * 2),
        height: Math.min(window.innerHeight - 16, rect.height + padding * 2),
      })
      element.scrollIntoView({
        block: 'center',
        inline: 'center',
        behavior: 'smooth',
      })
    }

    updateSpotlight()
    window.addEventListener('resize', updateSpotlight)
    window.addEventListener('scroll', updateSpotlight, true)

    return () => {
      window.removeEventListener('resize', updateSpotlight)
      window.removeEventListener('scroll', updateSpotlight, true)
    }
  }, [step.selector])

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose(false)
      }
    }

    window.addEventListener('keydown', handleKeydown)

    return () => window.removeEventListener('keydown', handleKeydown)
  }, [onClose])

  const isLastStep = index === steps.length - 1

  return (
    <div className="tour-root" role="dialog" aria-modal="true">
      <div
        className="tour-spotlight"
        style={{
          transform: `translate(${spotlight.left}px, ${spotlight.top}px)`,
          width: spotlight.width,
          height: spotlight.height,
        }}
      />
      <div className="tour-card" style={tooltipStyle}>
        <span className="tour-count">
          {index + 1} / {steps.length}
        </span>
        <h2>{step.title}</h2>
        <p>{step.description}</p>
        <div className="tour-actions">
          <button type="button" onClick={() => onClose(false)}>
            Esci dalla demo
          </button>
          <button
            className="primary"
            type="button"
            onClick={() => {
              if (isLastStep) {
                onClose(true)
                return
              }

              setIndex((current) => current + 1)
            }}
          >
            {isLastStep ? 'Fine' : 'Avanti ->'}
          </button>
        </div>
      </div>
    </div>
  )
}
