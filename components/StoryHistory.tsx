'use client'

import type { StoryRecord } from '@/lib/types'

interface Props {
  stories: StoryRecord[]
}

export default function StoryHistory({ stories }: Props) {
  if (stories.length === 0) return null

  return (
    <div className="story-history">
      <h3 className="story-history__title">
        Completed
        <span className="story-history__count">{stories.length}</span>
      </h3>
      <ul className="story-history__list">
        {[...stories].reverse().map((story, i) => (
          <li key={i} className="story-item">
            <div className="story-item__top">
              <span className="story-item__name">{story.title}</span>
              {story.consensus && (
                <span className="story-item__badge" title="Consensus reached">✓</span>
              )}
            </div>
            <div className="story-item__meta">
              {story.average !== null ? (
                <span className="story-item__avg">avg {story.average}</span>
              ) : (
                <span className="story-item__avg story-item__avg--none">no numeric votes</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
