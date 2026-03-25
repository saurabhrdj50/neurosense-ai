import React from 'react'
import { Section } from './ResultSection'
import { Music } from 'lucide-react'

export function MusicRecommendations({ music }) {
  if (!music?.recommendations?.length) return null

  return (
    <Section icon={Music} title="Therapeutic Music Recommendations" color="#22c55e" defaultOpen={false}>
      <div className="space-y-2">
        {music.recommendations.map((r, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
              <Music size={14} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#f1f5f9' }}>{r.title || r}</p>
              {r.artist && <p style={{ fontSize: 11, color: '#475569' }}>{r.artist}</p>}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
