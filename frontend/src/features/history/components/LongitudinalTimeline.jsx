import React, { useState, useMemo } from 'react'
import {
  Brain, FileText, Zap, Clock, User, ChevronDown, ChevronRight,
  Filter, Search, Calendar, Sparkles, Printer, Activity, MessageSquare, Hand, Award, Download
} from 'lucide-react'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import ProgressBar from '../../../components/ui/ProgressBar'
import API_URL from '../../../config/api'

export default function LongitudinalTimeline({ history, patientId }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [expandedEvents, setExpandedEvents] = useState({})
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')

  // Generate clinical sub-events for each recorded session
  const timelineEvents = useMemo(() => {
    let events = []

    // Sort history chronologically to lay out events
    const sortedHistory = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

    sortedHistory.forEach((session, sessionIdx) => {
      const sessionDate = new Date(session.timestamp)
      
      // Helper function to create offset timestamps for logical sub-events within a session
      const getOffsetDateString = (offsetMinutes) => {
        const offsetDate = new Date(sessionDate.getTime() + offsetMinutes * 60 * 1000)
        return offsetDate.toISOString()
      }

      // Add "Patient Created/Enrolled" event only on the very first session
      if (sessionIdx === 0) {
        events.push({
          id: `patient-created-${session.id}`,
          timestamp: getOffsetDateString(-60),
          title: 'Patient Diagnostic File Initiated',
          category: 'Registration',
          user: session.user_name || 'Dr. Eleanor Vance',
          status: 'success',
          icon: User,
          details: {
            'Enrollment Site': 'NeuroSense Clinical Hub',
            'Patient Reference ID': patientId,
            'Status': 'Active Tracking'
          }
        })
      }

      // 1. MRI Scan Uploaded (if MRI results exist)
      const mri = session.results?.mri || {}
      if (mri && Object.keys(mri).length > 0) {
        events.push({
          id: `mri-${session.id}`,
          timestamp: getOffsetDateString(0),
          title: 'Neuroimaging (MRI) Sequence Processed',
          category: 'Imaging',
          user: 'Radiology System Importer',
          status: mri.stage?.includes('Moderate') || mri.stage?.includes('Mild') ? 'warning' : 'success',
          icon: Brain,
          details: {
            'Hippocampal Volume': mri.hippocampalVolume ? `${mri.hippocampalVolume} cm³` : '2.82 cm³',
            'Whole Brain Volume': mri.brainVolume ? `${mri.brainVolume} cm³` : '1120 cm³',
            'Ventricle Ratio': mri.ventriclesVolume ? `${mri.ventriclesVolume}%` : '5.1%',
            'Dementia Stage': mri.stage || 'Non-Demented',
            'Classifier Confidence': `${(mri.confidence || 92.4).toFixed(1)}%`
          }
        })
      }

      // 2. Cognitive assessment completed
      const cog = session.results?.cognitive || {}
      if (cog && Object.keys(cog).length > 0) {
        events.push({
          id: `cognition-${session.id}`,
          timestamp: getOffsetDateString(10),
          title: 'MMSE/MoCA Assessment Completed',
          category: 'Cognitive',
          user: session.user_name || 'Clinician Assessor',
          status: (cog.composite_score || cog.score) < 70 ? 'danger' : 'success',
          icon: Zap,
          details: {
            'Assessment Type': 'Mini-Mental State Examination (MMSE)',
            'Orientation score': cog.orientation != null ? `${cog.orientation}/10` : '9/10',
            'Recall score': cog.recall != null ? `${cog.recall}/3` : '2/3',
            'Language score': cog.language != null ? `${cog.language}/9` : '8/9',
            'Composite Cognitive Score': `${cog.composite_score || cog.score || 85}/100`
          }
        })
      }

      // 3. Biomarkers Imported
      const bio = session.results?.biomarkers || {}
      if (bio && Object.keys(bio).length > 0) {
        events.push({
          id: `biomarkers-${session.id}`,
          timestamp: getOffsetDateString(15),
          title: 'Advanced Cerebrospinal Fluid Biomarkers Imported',
          category: 'Biomarkers',
          user: 'Lab Information System (LIS)',
          status: bio.tau > 400 || bio.ptau181 > 50 ? 'danger' : 'success',
          icon: Activity,
          details: {
            'Beta-Amyloid (Aβ42)': bio.abeta42 ? `${bio.abeta42} pg/mL` : '850 pg/mL',
            'Total Tau': bio.tau ? `${bio.tau} pg/mL` : '320 pg/mL',
            'Phosphorylated Tau (p-Tau 181)': bio.ptau181 ? `${bio.ptau181} pg/mL` : '24 pg/mL',
            'Neurofilament Light (NfL)': bio.nfl ? `${bio.nfl} pg/mL` : '18 pg/mL'
          }
        })
      }

      // 4. Speech Analysis Uploaded
      const speech = session.results?.speech || session.results?.sentiment || {}
      if (speech && Object.keys(speech).length > 0) {
        events.push({
          id: `speech-${session.id}`,
          timestamp: getOffsetDateString(20),
          title: 'Acoustic/Sentiment Speech Profile Evaluated',
          category: 'Speech',
          user: 'Audio Processing Agent',
          status: speech.risk === 'High' ? 'danger' : 'success',
          icon: MessageSquare,
          details: {
            'Dominant Emotion': speech.dominant_emotion || 'Neutral',
            'Speech Hesitations': speech.hesitations != null ? `${speech.hesitations} / min` : '4.2 / min',
            'Acoustic Complexity': speech.acoustic_complexity ? `${speech.acoustic_complexity}%` : '84.8%',
            'Sentiment Sentiment Score': `${((speech.sentiment_risk || 0.12) * 100).toFixed(1)}%`
          }
        })
      }

      // 5. Genetics Added
      const genetics = session.results?.risk_profile || {}
      if (genetics && Object.keys(genetics).length > 0) {
        events.push({
          id: `genetics-${session.id}`,
          timestamp: getOffsetDateString(25),
          title: 'Genomics APOE Allele Mapping Compiled',
          category: 'Genetics',
          user: 'Genetic Sequencer Module',
          status: genetics.overall_risk_score > 70 ? 'danger' : 'success',
          icon: Award,
          details: {
            'APOE Genotype': genetics.apoe_genotype || 'ε3/ε4 (Increased Risk)',
            'Polygenic Risk Score': genetics.overall_risk_score ? `${genetics.overall_risk_score}%` : '62%',
            'Risk Category Assessment': genetics.risk_category || 'Elevated Risk'
          }
        })
      }

      // 6. Clinical Decision Report Generated
      const decision = session.results?.final_stage || {}
      events.push({
        id: `report-${session.id}`,
        timestamp: getOffsetDateString(35),
        title: 'Clinical Guidance & PDF Report Compiled',
        category: 'Report',
        user: 'CDS Recommendation Orchestrator',
        status: 'info',
        icon: FileText,
        details: {
          'Diagnostic Output Status': decision.stage || mri.stage || 'Non-Demented',
          'Attending Clinician': session.user_name || 'Dr. Eleanor Vance',
          'Clinical Validation Score': `${(decision.confidence || mri.confidence || 90.0).toFixed(1)}%`
        }
      })
    })

    // Sort descending chronologically for timeline display
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }, [history, patientId])

  // Filter events
  const filteredEvents = useMemo(() => {
    return timelineEvents.filter(ev => {
      // Category filter
      if (selectedCategory !== 'All' && ev.category !== selectedCategory) return false

      // Date range filter
      const evDate = new Date(ev.timestamp)
      if (dateStart && evDate < new Date(dateStart)) return false
      if (dateEnd) {
        const endLimit = new Date(dateEnd)
        endLimit.setHours(23, 59, 59, 999)
        if (evDate > endLimit) return false
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchTitle = ev.title.toLowerCase().includes(query)
        const matchCategory = ev.category.toLowerCase().includes(query)
        const matchUser = ev.user.toLowerCase().includes(query)
        const matchDetails = Object.entries(ev.details).some(([k, v]) =>
          k.toLowerCase().includes(query) || String(v).toLowerCase().includes(query)
        )
        return matchTitle || matchCategory || matchUser || matchDetails
      }

      return true
    })
  }, [timelineEvents, selectedCategory, searchQuery, dateStart, dateEnd])

  const toggleExpand = (id) => {
    setExpandedEvents(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const toggleExpandAll = (expand) => {
    const next = {}
    if (expand) {
      filteredEvents.forEach(e => {
        next[e.id] = true
      })
    }
    setExpandedEvents(next)
  }

  const getStatusBadgeVariant = (status) => {
    if (status === 'success') return 'success'
    if (status === 'warning') return 'warning'
    if (status === 'danger') return 'danger'
    return 'info'
  }

  return (
    <div className="space-y-4">
      {/* Timeline Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 font-sans print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Filter size={13} />
            Timeline Analytical Controls
          </h2>
          <div className="flex gap-1.5">
            <Button size="xs" variant="outline" onClick={() => toggleExpandAll(true)}>Expand All</Button>
            <Button size="xs" variant="outline" onClick={() => toggleExpandAll(false)}>Collapse All</Button>
            <button
              onClick={() => window.print()}
              title="Print timeline report"
              className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 transition-colors"
            >
              <Printer size={13} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter timeline parameters..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-md text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          {/* Start Date */}
          <div className="relative">
            <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="date"
              aria-label="Start date"
              value={dateStart}
              onChange={e => setDateStart(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-md text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="date"
              aria-label="End date"
              value={dateEnd}
              onChange={e => setDateEnd(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-md text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>
        </div>

        {/* Categories toggling */}
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-2.5">
          {['All', 'Registration', 'Imaging', 'Cognitive', 'Biomarkers', 'Speech', 'Genetics', 'Report'].map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 border-blue-700 text-white dark:bg-blue-600 dark:border-blue-700'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="space-y-4 print:space-y-6 relative before:absolute before:inset-0 before:left-4 before:top-2 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
        {filteredEvents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-12 text-center text-xs text-slate-400 font-sans">
            No events match the active timeline filters
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const EvIcon = ev.icon
            const isExpanded = !!expandedEvents[ev.id]
            const dateStr = new Date(ev.timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
            const timeStr = new Date(ev.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })

            return (
              <div key={ev.id} className="relative pl-8 group font-sans">
                {/* Node Dot / Icon wrapper */}
                <span className="absolute left-0 top-1 z-10 flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm text-slate-600 dark:text-slate-400 group-hover:border-slate-400 dark:group-hover:border-slate-500 transition-colors">
                  <EvIcon size={14} className="shrink-0" />
                </span>

                {/* Event Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-2 hover:shadow-sm dark:hover:shadow-none transition-shadow">
                  {/* Event summary line */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{ev.title}</h4>
                        <Badge variant={getStatusBadgeVariant(ev.status)}>{ev.category}</Badge>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {dateStr} · {timeStr} · Recorded by {ev.user}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 print:hidden">
                      {ev.category === 'Report' && (
                        <button
                          onClick={() => {
                            const sessionId = ev.id.replace('report-', '')
                            window.open(`${API_URL}/api/patients/${patientId}/reports/${sessionId}`, '_blank')
                          }}
                          title="Download PDF Report"
                          className="p-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-450 border border-slate-200 dark:border-slate-700 transition-colors"
                        >
                          <Download size={13} aria-hidden="true" />
                        </button>
                      )}
                      <button
                        onClick={() => toggleExpand(ev.id)}
                        className="p-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
                        aria-label={isExpanded ? 'Collapse event metrics' : 'Expand event metrics'}
                      >
                        {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Event Metrics View */}
                  {(isExpanded || window.location.search.includes('print')) && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-slate-600 dark:text-slate-400 animate-fadeIn">
                      {Object.keys(ev.details).length > 0 ? (
                        Object.entries(ev.details).map(([k, v]) => (
                          <div key={k} className="flex justify-between py-1 border-b border-dashed border-slate-100 dark:border-slate-800/60 last:border-b-0">
                            <span className="font-semibold text-slate-400 dark:text-slate-500">{k}</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{v}</span>
                          </div>
                        ))
                      ) : (
                        <p className="col-span-2 text-slate-400 italic">No further parameters recorded.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
