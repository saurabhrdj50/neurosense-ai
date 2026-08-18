import React from 'react'
import { Section } from './ResultSection'
import { Music, Play, ExternalLink, Sparkles, Heart } from 'lucide-react'

export function MusicRecommendations({ music }) {
  const recommendations = music?.recommendations || [
    { title: "Clair de Lune (Debussy)", artist: "Nostalgic Acoustic Piano", tempo: "60 BPM", type: "Memory Recall", url: "https://open.spotify.com/search/Clair%20de%20Lune" },
    { title: "528 Hz Healing Alpha Tone", artist: "NeuroSense Ambient", tempo: "Calming", type: "Sundowning Reduction", url: "https://open.spotify.com/search/528Hz%20Alpha" },
    { title: "Vivaldi - Four Seasons (Spring)", artist: "Classical Orchestral", tempo: "72 BPM", type: "Cognitive Stimulation", url: "https://open.spotify.com/search/Vivaldi%20Four%20Seasons" }
  ]

  return (
    <Section icon={Music} title="Therapeutic Music & Acoustic Stimulation" color="#22c55e" defaultOpen={true}>
      <div className="space-y-3">
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-foreground font-semibold">Stage-Tuned Auditory Therapy</span>
          </div>
          <span className="text-[11px] text-emerald-300 font-mono">60-80 BPM Neuroplasticity Protocol</span>
        </div>

        <div className="space-y-2">
          {recommendations.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border/80 hover:border-emerald-500/30 transition-all text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <Play size={14} className="text-emerald-400 fill-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground">{item.title || item}</p>
                    {item.type && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {item.type}
                      </span>
                    )}
                  </div>
                  {item.artist && (
                    <p className="text-[11px] text-foreground-muted mt-0.5">
                      {item.artist} {item.tempo && <span className="font-mono text-indigo-400 ml-1.5">• {item.tempo}</span>}
                    </p>
                  )}
                </div>
              </div>

              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 text-[11px] font-semibold transition-all"
                >
                  <ExternalLink size={12} />
                  <span>Listen</span>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}
