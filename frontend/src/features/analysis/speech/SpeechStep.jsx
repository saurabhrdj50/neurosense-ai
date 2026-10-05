import React, { useState, useEffect, useRef } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Mic, Square, Play, Volume2, CheckCircle2, ChevronRight, ChevronLeft,
  MessageSquare, Maximize2, X, Activity, FileText, Globe, VolumeX,
  Type, Sun, Moon, Image as ImageIcon, RotateCcw, Trash2
} from 'lucide-react'
import DropZone from '../../../shared/components/ui/DropZone'

const GUIDED_TASKS = [
  { id: 1, title: 'Introduce Yourself', prompt: 'Please state your full name, age, and where you live.', sampleText: 'My name is Arthur Pendelton, I am 68 years old, and I live in Boston, Massachusetts.' },
  { id: 2, title: 'Describe Your Morning', prompt: 'Describe what you did from the time you woke up this morning until now.', sampleText: 'I woke up at seven, made coffee, read the morning paper, and had toast before coming to the clinic.' },
  { id: 3, title: 'Animal Category Naming', prompt: 'Name as many animals as you can in 60 seconds.', sampleText: 'Dog, cat, horse, elephant, tiger, lion, bear, eagle, hawk, dolphin, whale.' },
  { id: 4, title: 'Cookie Theft Picture Description', prompt: 'Tell me everything happening in this picture.', sampleText: 'A woman is washing dishes while the sink overflows. Two children are trying to reach the cookie jar.', isVisual: true },
  { id: 5, title: 'Delayed Story Recall', prompt: 'Tell me back the story details we read to you earlier.', sampleText: 'The woman lost her handbag at the train station, but a conductor returned it to her.' },
]

const SUPPORTED_LANGUAGES = [
  { code: 'auto', label: '🌐 Auto-Detect (Multilingual AI)', ttsLang: 'en-US' },
  { code: 'en', label: '🇺🇸 English (US / UK / IN)', ttsLang: 'en-US' },
  { code: 'hi', label: '🇮🇳 Hindi (हिंदी)', ttsLang: 'hi-IN' },
]

const LOCALIZED_PROMPTS = {
  hi: {
    1: { title: 'अपना परिचय दें', prompt: 'कृपया अपना पूरा नाम, उम्र और आप कहां रहते हैं बताएं।' },
    2: { title: 'अपनी सुबह का वर्णन करें', prompt: 'आज सुबह उठने से लेकर अब तक आपने क्या-क्या किया, उसका विवरण दें।' },
    3: { title: 'जानवरों के नाम (Category Naming)', prompt: '60 सेकंड में जितने जानवरों के नाम बता सकते हैं, बताएं।' },
    4: { title: 'चित्र विवरण (Cookie Theft)', prompt: 'इस चित्र में जो कुछ भी हो रहा है, मुझे सब कुछ बताएं।' },
    5: { title: 'कहानी दोहराएं (Story Recall)', prompt: 'जो कहानी हमने आपको पढ़कर सुनाई थी, उसके विवरण मुझे वापस बताएं।' },
  },
}

/* Sample texts are prompt DISPLAY ONLY (see GUIDED_TASKS.sampleText):
   they are never attached to a submission as if the patient spoke them. */

/* ── Vector Boston Cookie Theft Scene Illustration ───────────────────────── */
function CookieTheftIllustration() {
  return (
    <div className="w-full max-w-lg mx-auto bg-slate-900/90 rounded-2xl p-4 border border-cyan-500/30 shadow-2xl space-y-3 select-none">
      <div className="flex items-center justify-between text-xs font-mono text-cyan-400 font-bold px-1">
        <span className="flex items-center gap-1.5"><ImageIcon size={14} /> Boston Cookie Theft Clinical Scene</span>
        <span className="text-[10px] bg-cyan-500/20 px-2 py-0.5 rounded text-cyan-300">Picture Description Task</span>
      </div>

      <svg viewBox="0 0 500 320" className="w-full h-auto rounded-xl bg-slate-950 border border-slate-800">
        {/* Kitchen Window & Curtain */}
        <rect x="20" y="20" width="120" height="90" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="3" />
        <line x1="80" y1="20" x2="80" y2="110" stroke="#475569" strokeWidth="2" />
        <line x1="20" y1="65" x2="140" y2="65" stroke="#475569" strokeWidth="2" />
        <path d="M 20 20 Q 50 50 20 110 L 20 20 Z" fill="#38bdf8" opacity="0.4" />
        <path d="M 140 20 Q 110 50 140 110 L 140 20 Z" fill="#38bdf8" opacity="0.4" />

        {/* Countertop & Sink */}
        <rect x="10" y="150" width="200" height="150" rx="8" fill="#334155" />
        <ellipse cx="90" cy="165" rx="55" ry="18" fill="#0f172a" stroke="#64748b" strokeWidth="3" />
        
        {/* Faucet & Water Overflowing */}
        <path d="M 90 145 C 90 120, 110 120, 110 135" fill="none" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
        <path d="M 90 145 L 90 190" fill="none" stroke="#38bdf8" strokeWidth="4" className="animate-pulse" />
        <path d="M 50 170 Q 90 200 130 170" fill="#38bdf8" opacity="0.7" />
        {/* Water Splashes on Floor */}
        <ellipse cx="90" cy="285" rx="65" ry="12" fill="#38bdf8" opacity="0.5" />
        <ellipse cx="60" cy="275" rx="25" ry="6" fill="#0284c7" opacity="0.6" />

        {/* Mother Figure Washing Dishes */}
        <circle cx="85" cy="80" r="18" fill="#f43f5e" />
        <path d="M 70 98 Q 85 110 100 98 L 110 160 L 60 160 Z" fill="#e11d48" />
        <path d="M 60 110 L 35 155" stroke="#f43f5e" strokeWidth="7" strokeLinecap="round" />
        <path d="M 105 110 L 85 155" stroke="#f43f5e" strokeWidth="7" strokeLinecap="round" />

        {/* Cabinets & Cookie Jar (Right Side) */}
        <rect x="300" y="20" width="180" height="90" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="3" />
        <rect x="310" y="30" width="75" height="70" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="2" />
        <rect x="395" y="30" width="75" height="70" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="2" />

        {/* Cookie Jar on Top Shelf */}
        <rect x="330" y="10" width="35" height="20" rx="4" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
        <text x="334" y="24" fill="#000" fontSize="8" fontWeight="bold" fontFamily="sans-serif">COOKIES</text>

        {/* Tipping Stool */}
        <g transform="rotate(15, 360, 230)">
          <rect x="340" y="190" width="50" height="10" rx="2" fill="#854d0e" />
          <line x1="345" y1="200" x2="340" y2="260" stroke="#a16207" strokeWidth="5" />
          <line x1="385" y1="200" x2="390" y2="260" stroke="#a16207" strokeWidth="5" />
          <line x1="342" y1="230" x2="388" y2="230" stroke="#a16207" strokeWidth="3" />
        </g>

        {/* Boy Reaching for Cookie Jar */}
        <circle cx="375" cy="70" r="16" fill="#3b82f6" />
        <path d="M 360 86 Q 375 95 390 86 L 395 160 L 355 160 Z" fill="#2563eb" />
        <path d="M 385 90 L 350 25" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" />

        {/* Girl Reaching Up for Cookie */}
        <circle cx="435" cy="150" r="14" fill="#a855f7" />
        <path d="M 420 164 Q 435 172 450 164 L 455 230 L 415 230 Z" fill="#9333ea" />
        <path d="M 425 170 L 380 120" stroke="#a855f7" strokeWidth="5" strokeLinecap="round" />

        {/* Labels for Diagnostic Clarity */}
        <rect x="35" y="290" width="110" height="20" rx="4" fill="#0284c7" />
        <text x="42" y="304" fill="#ffffff" fontSize="10" fontWeight="bold">1. Sink Overflowing</text>

        <rect x="310" y="290" width="160" height="20" rx="4" fill="#d97706" />
        <text x="316" y="304" fill="#ffffff" fontSize="10" fontWeight="bold">2. Children Stealing Cookies</text>
      </svg>
    </div>
  )
}

export function SpeechStep({ speechText, setSpeechText, audioFile, setAudioFile }) {
  const [isRecording, setIsRecording] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState(1)
  const [completedTaskIds, setCompletedTaskIds] = useState([])
  const [patientModalText, setPatientModalText] = useState(null)
  const [isPlayingBack, setIsPlayingBack] = useState(false)
  const [lastRecordedTask, setLastRecordedTask] = useState(null)
  const [selectedLanguage, setSelectedLanguage] = useState('auto')
  const [availableVoices, setAvailableVoices] = useState([])

  /* Fullscreen Patient Mode Accessibility States */
  const [isSpeakingPrompt, setIsSpeakingPrompt] = useState(false)
  const [textSizeMultiplier, setTextSizeMultiplier] = useState(1) // 1 = Normal, 1.25 = Large, 1.5 = Huge
  const [isHighContrast, setIsHighContrast] = useState(false)

  /* MediaRecorder & SpeechRecognition API refs & state */
  const mediaRecorderRef = useRef(null)
  const recognitionRef = useRef(null)
  const recordedLiveTextRef = useRef('')
  const audioChunksRef = useRef([])
  const playbackAudioRef = useRef(null)
  const [taskAudios, setTaskAudios] = useState({}) // { [taskId]: Blob }
  const [playingTaskId, setPlayingTaskId] = useState(null) // null | 'all' | taskId

  const activeTask = GUIDED_TASKS.find(t => t.id === activeTaskId)

  // Dynamically compute localized title & prompt for the main page view
  const currentLocalizedMain = LOCALIZED_PROMPTS[selectedLanguage]?.[activeTaskId]
  const mainTitle = currentLocalizedMain?.title || activeTask?.title
  const mainPrompt = currentLocalizedMain?.prompt || activeTask?.prompt

  // Asynchronously load and update browser TTS voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        if (voices.length > 0) {
          setAvailableVoices(voices)
        }
      }
      updateVoices()
      window.speechSynthesis.onvoiceschanged = updateVoices
    }
  }, [])

  // Get active prompt localized if available for modal
  const currentLocalizedModal = LOCALIZED_PROMPTS[selectedLanguage]?.[patientModalText?.id]
  const displayTitle = currentLocalizedModal?.title || patientModalText?.title
  const displayPrompt = currentLocalizedModal?.prompt || patientModalText?.prompt

  // Sync active task with modal if modal is open
  useEffect(() => {
    if (patientModalText) {
      const currentTask = GUIDED_TASKS.find(t => t.id === activeTaskId)
      if (currentTask && currentTask.id !== patientModalText.id) {
        setPatientModalText(currentTask)
      }
    }
    // Runs on task change only: reacting to patientModalText identity would
    // re-trigger on the very state this effect sets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTaskId])

  const stopAllTTS = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeakingPrompt(false)
  }

  // Reset ONLY the currently active task
  const handleResetCurrentTask = () => {
    if (isRecording) {
      setIsRecording(false)
    }
    stopAllTTS()
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause()
      playbackAudioRef.current = null
    }
    setPlayingTaskId(null)
    setIsPlayingBack(false)

    // Remove activeTaskId from completedTaskIds and taskAudios
    setCompletedTaskIds(prev => prev.filter(id => id !== activeTaskId))
    setTaskAudios(prev => {
      const next = { ...prev }
      delete next[activeTaskId]
      return next
    })
    if (lastRecordedTask === activeTaskId) {
      setLastRecordedTask(null)
    }

    // Remove transcript section belonging ONLY to activeTaskId
    setSpeechText(prev => {
      if (!prev) return ''
      // Matches `[Task X - ...]: ...` up to double newline or end of text
      const regex = new RegExp(`\\[Task\\s+${activeTaskId}\\s+-[^\\]]*\\]:[^\\n]*(\\n\\n)?`, 'gi')
      const cleaned = prev.replace(regex, '').trim()
      return cleaned
    })
  }

  // Clear / Reset ALL recorded audio tasks and transcripts
  const handleResetAllAssessment = () => {
    if (isRecording) {
      setIsRecording(false)
    }
    stopAllTTS()
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause()
      playbackAudioRef.current = null
    }
    setPlayingTaskId(null)
    setIsPlayingBack(false)
    setCompletedTaskIds([])
    setTaskAudios({})
    setLastRecordedTask(null)
    setActiveTaskId(1)
    setSpeechText('')
    setAudioFile(null)
  }

  // Stop TTS ONLY when modal is closed
  useEffect(() => {
    if (!patientModalText) {
      stopAllTTS()
    }
    // Primitive id dep is deliberate — identity changes must not restart TTS.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientModalText?.id, selectedLanguage])

  const startMediaRecorder = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone recording is not supported in this browser environment.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      
      const options = MediaRecorder.isTypeSupported('audio/webm')
        ? { mimeType: 'audio/webm' }
        : MediaRecorder.isTypeSupported('audio/ogg')
        ? { mimeType: 'audio/ogg' }
        : {}

      const recorder = new MediaRecorder(stream, options)
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        // Stop all audio tracks to release microphone hardware access
        stream.getTracks().forEach(track => track.stop())
        
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        if (audioBlob.size > 0) {
          setTaskAudios(prev => {
            const updated = { ...prev, [activeTaskId]: audioBlob }
            // Create a consolidated combined audio file of all tasks recorded so far
            const allBlobs = Object.keys(updated)
              .sort((a, b) => Number(a) - Number(b))
              .map(k => updated[k])
            const combinedBlob = new Blob(allBlobs, { type: recorder.mimeType || 'audio/webm' })
            const combinedFile = new File([combinedBlob], `patient_speech_all_tasks.webm`, { type: combinedBlob.type })
            setAudioFile(combinedFile)
            return updated
          })
        }
      }

      mediaRecorderRef.current = recorder
      recordedLiveTextRef.current = ''
      recorder.start(250) // collect chunks every 250ms

      // Initialize browser SpeechRecognition to transcribe actual spoken voice in real-time
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition()
          recognition.continuous = true
          recognition.interimResults = true
          const langCode = selectedLanguage === 'hi' ? 'hi-IN' : 'en-US'
          recognition.lang = langCode

          recognition.onresult = (event) => {
            let transcript = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript
            }
            if (transcript.trim()) {
              recordedLiveTextRef.current = transcript.trim()
            }
          }

          recognition.onerror = (e) => {
            console.warn('SpeechRecognition live error:', e)
          }

          recognition.start()
          recognitionRef.current = recognition
        } catch (recErr) {
          console.warn('SpeechRecognition initialization warning:', recErr)
        }
      }

      setIsRecording(true)
      setIsPlayingBack(false)

    } catch (err) {
      console.error('Microphone Access Error:', err)
      setIsRecording(false)
    }
  }

  const stopMediaRecorder = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore stop errors
      }
      recognitionRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    setIsRecording(false)

    // Append ONLY the actual live-transcribed patient speech. The sample
    // reading prompt displayed for each task is never submitted as if the
    // patient said it — if recognition captured nothing, the task stays
    // incomplete and the clinician is asked to record again or type the
    // response manually.
    const liveText = recordedLiveTextRef.current.trim()

    if (liveText) {
      setSpeechText(prev => {
        const prefix = prev ? `${prev}\n\n[Task ${activeTaskId} - ${mainTitle}]: ` : `[Task ${activeTaskId} - ${mainTitle}]: `
        return `${prefix}${liveText}`
      })

      if (!completedTaskIds.includes(activeTaskId)) {
        setCompletedTaskIds(prev => [...prev, activeTaskId])
      }
      setLastRecordedTask(activeTaskId)

      if (activeTaskId < GUIDED_TASKS.length) {
        setTimeout(() => {
          setActiveTaskId(prev => Math.min(GUIDED_TASKS.length, prev + 1))
        }, 600)
      }
    } else {
      toast(
        `No speech transcript was captured for Task ${activeTaskId}. The reading prompt is never used as the patient's response — please record again or type the response manually.`,
        { icon: '⚠️', duration: 6000 }
      )
    }
  }

  const handleToggleRecording = () => {
    if (!isRecording) {
      startMediaRecorder()
    } else {
      stopMediaRecorder()
    }
  }

  // Play individual task recording
  const handlePlayTaskAudio = (targetTaskId = activeTaskId) => {
    try {
      if (playbackAudioRef.current) {
        playbackAudioRef.current.pause()
        playbackAudioRef.current = null
      }

      if (playingTaskId === targetTaskId) {
        setPlayingTaskId(null)
        setIsPlayingBack(false)
        return
      }

      const blob = taskAudios[targetTaskId] || (targetTaskId === activeTaskId && audioChunksRef.current?.length > 0 ? new Blob(audioChunksRef.current, { type: 'audio/webm' }) : null)

      let audioUrl = null
      if (blob) {
        audioUrl = URL.createObjectURL(blob)
      } else if (audioFile && audioFile instanceof File) {
        audioUrl = URL.createObjectURL(audioFile)
      }

      if (!audioUrl) {
        return
      }

      const audio = new Audio(audioUrl)
      playbackAudioRef.current = audio
      setPlayingTaskId(targetTaskId)
      setIsPlayingBack(true)

      audio.onended = () => {
        setPlayingTaskId(null)
        setIsPlayingBack(false)
        playbackAudioRef.current = null
        URL.revokeObjectURL(audioUrl)
      }

      audio.onerror = (e) => {
        console.warn('Audio playback error:', e)
        setPlayingTaskId(null)
        setIsPlayingBack(false)
        playbackAudioRef.current = null
        URL.revokeObjectURL(audioUrl)
      }

      audio.play().catch(err => {
        console.error('Audio play exception:', err)
        setPlayingTaskId(null)
        setIsPlayingBack(false)
        playbackAudioRef.current = null
      })

    } catch (err) {
      console.error('Playback error:', err)
      setPlayingTaskId(null)
      setIsPlayingBack(false)
    }
  }

  // Play ALL recorded tasks in sequence
  const handlePlayAllTasks = () => {
    try {
      if (playbackAudioRef.current) {
        playbackAudioRef.current.pause()
        playbackAudioRef.current = null
      }

      if (playingTaskId === 'all') {
        setPlayingTaskId(null)
        setIsPlayingBack(false)
        return
      }

      const recordedTaskIds = Object.keys(taskAudios).sort((a, b) => Number(a) - Number(b))
      if (recordedTaskIds.length === 0) {
        // If only audioFile exists
        if (audioFile && audioFile instanceof File) {
          handlePlayTaskAudio(activeTaskId)
        }
        return
      }

      let currentIndex = 0
      setPlayingTaskId('all')
      setIsPlayingBack(true)

      const playNext = () => {
        if (currentIndex >= recordedTaskIds.length) {
          setPlayingTaskId(null)
          setIsPlayingBack(false)
          playbackAudioRef.current = null
          return
        }

        const tId = recordedTaskIds[currentIndex]
        const blob = taskAudios[tId]
        if (!blob) {
          currentIndex++
          playNext()
          return
        }

        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        playbackAudioRef.current = audio

        audio.onended = () => {
          URL.revokeObjectURL(url)
          currentIndex++
          playNext()
        }

        audio.onerror = () => {
          URL.revokeObjectURL(url)
          currentIndex++
          playNext()
        }

        audio.play().catch(err => {
          console.warn('Play error in sequence:', err)
          currentIndex++
          playNext()
        })
      }

      playNext()

    } catch (err) {
      console.error('Play all error:', err)
      setPlayingTaskId(null)
      setIsPlayingBack(false)
    }
  }

  const handleReplayAudio = () => {
    handlePlayTaskAudio(activeTaskId)
  }

  /* Ultra-Reliable Non-Blocking Web Speech API Synthesizer */
  const handleToggleTTS = () => {
    if (isSpeakingPrompt) {
      stopAllTTS()
      return
    }

    if (!patientModalText) return

    if (!('speechSynthesis' in window)) {
      alert('Text to speech is not supported in this browser.')
      return
    }

    // Cancel previous speech instance
    window.speechSynthesis.cancel()

    const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0]
    const loc = LOCALIZED_PROMPTS[selectedLanguage]?.[patientModalText.id]
    
    const titleToSpeak = loc?.title || patientModalText.title
    const promptToSpeak = loc?.prompt || patientModalText.prompt
    const textToSpeak = `${titleToSpeak}. ${promptToSpeak}`

    const targetLang = langConfig.code === 'auto' ? 'en' : langConfig.code

    // Use setTimeout (60ms) so Chrome's async speechSynthesis.cancel() finishes before starting new utterance
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(textToSpeak)
        utterance.lang = langConfig.ttsLang
        utterance.rate = 0.88

        const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices()
        
        // Find best matching voice for selected locale or fallback to target language prefix
        const matchedVoice = voices.find(v => 
          v.lang.toLowerCase().replace('_', '-').startsWith(langConfig.ttsLang.toLowerCase()) ||
          v.lang.toLowerCase().startsWith(targetLang)
        )

        if (matchedVoice) {
          utterance.voice = matchedVoice
        }

        utterance.onstart = () => {
          setIsSpeakingPrompt(true)
        }

        utterance.onend = () => {
          setIsSpeakingPrompt(false)
        }

        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis Utterance error:', e)
          setIsSpeakingPrompt(false)
        }

        setIsSpeakingPrompt(true)
        window.speechSynthesis.speak(utterance)
      } catch (err) {
        console.error('SpeechSynthesis speak exception:', err)
        setIsSpeakingPrompt(false)
      }
    }, 60)
  }

  /* Font Size Toggle inside Modal */
  const handleCycleTextSize = () => {
    setTextSizeMultiplier(prev => {
      if (prev === 1) return 1.25
      if (prev === 1.25) return 1.5
      return 1
    })
  }

  return (
    <div className="space-y-5">
      {/* ── ENHANCED FULLSCREEN PATIENT DISPLAY MODAL ──────────────────────── */}
      <AnimatePresence>
        {patientModalText && (
          <Motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed inset-0 z-50 flex flex-col justify-between p-6 sm:p-10 select-none overflow-y-auto ${
              isHighContrast
                ? 'bg-black text-yellow-300 border-4 border-yellow-400'
                : 'bg-slate-950/95 backdrop-blur-xl text-white'
            }`}
          >
            {/* Top Toolbar (Controls & Navigation) */}
            <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase ${
                  isHighContrast ? 'bg-yellow-400 text-black' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                }`}>
                  Patient Display Mode · Task {activeTaskId} of {GUIDED_TASKS.length}
                </span>
                <span className="text-xs font-bold text-slate-400 hidden sm:inline">
                  [{SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.label}]
                </span>
              </div>

              {/* Toolbar Actions: Text Size, Contrast, Multilingual TTS Read Aloud & Close */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCycleTextSize}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isHighContrast ? 'bg-yellow-400 text-black' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title="Change Font Size (Normal / Large / Huge)"
                >
                  <Type size={14} /> Text Size: {textSizeMultiplier === 1 ? 'Normal' : textSizeMultiplier === 1.25 ? 'Large' : 'Huge'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsHighContrast(prev => !prev)}
                  className={`p-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isHighContrast ? 'bg-yellow-400 text-black' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title="Toggle High Contrast Mode"
                >
                  {isHighContrast ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                <button
                  type="button"
                  onClick={handleToggleTTS}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isSpeakingPrompt
                      ? 'bg-amber-500 text-black animate-pulse shadow-md'
                      : isHighContrast
                      ? 'bg-yellow-400 text-black'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                  }`}
                  title="Read Task Prompt Aloud in Selected Spoken Language"
                >
                  {isSpeakingPrompt ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  {isSpeakingPrompt ? 'Stop Voice' : `🔊 Read Aloud (${SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.code.toUpperCase()})`}
                </button>

                <button
                  type="button"
                  onClick={() => setPatientModalText(null)}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer ml-2"
                  title="Exit Patient Mode"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Central Main Content Box */}
            <div className="my-auto py-6 max-w-3xl mx-auto w-full text-center space-y-6">
              <h2
                className={`font-black tracking-tight leading-tight ${
                  isHighContrast ? 'text-yellow-300' : 'text-white'
                }`}
                style={{ fontSize: `${2.25 * textSizeMultiplier}rem` }}
              >
                {displayTitle}
              </h2>

              <div
                className={`p-8 rounded-3xl border text-center leading-relaxed transition-all shadow-2xl ${
                  isHighContrast
                    ? 'bg-black border-yellow-400 text-yellow-300'
                    : 'bg-white/5 border-white/15 text-slate-100 backdrop-blur-md'
                }`}
              >
                <p
                  className="font-medium"
                  style={{ fontSize: `${1.5 * textSizeMultiplier}rem` }}
                >
                  "{displayPrompt}"
                </p>
              </div>

              {/* Interactive Boston Cookie Theft Picture Scene */}
              {patientModalText.isVisual && <CookieTheftIllustration />}

              {/* In-Modal Direct Voice Recorder Control */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/15 max-w-md mx-auto flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handleToggleRecording}
                  className={`px-5 py-3 rounded-xl font-extrabold flex items-center gap-2 text-sm transition-all shadow-lg cursor-pointer ${
                    isRecording
                      ? 'bg-rose-500 text-white animate-pulse'
                      : isHighContrast
                      ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                      : 'bg-emerald-500 text-white hover:bg-emerald-400'
                  }`}
                >
                  {isRecording ? <Square size={18} /> : <Mic size={18} />}
                  {isRecording ? 'Stop Recording' : completedTaskIds.includes(activeTaskId) ? 'Retake Recording' : 'Start Recording This Task'}
                </button>

                {isRecording ? (
                  <div className="flex items-center gap-1.5">
                    {[16, 32, 20, 40, 24, 36, 18].map((h, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-rose-400 rounded-full animate-bounce"
                        style={{ height: `${h}px`, animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                ) : completedTaskIds.includes(activeTaskId) ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Recorded
                    </span>
                    <button
                      type="button"
                      onClick={handleResetCurrentTask}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                      title="Reset Task Audio & Transcript"
                    >
                      Reset Task {activeTaskId}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">Microphone Ready</span>
                )}
              </div>
            </div>

            {/* Bottom Task Navigation Bar */}
            <div className="flex items-center justify-between border-t border-white/15 pt-4 shrink-0">
              <button
                type="button"
                disabled={activeTaskId <= 1}
                onClick={() => setActiveTaskId(prev => Math.max(1, prev - 1))}
                className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  activeTaskId <= 1
                    ? 'opacity-30 cursor-not-allowed bg-white/5 text-white/40'
                    : isHighContrast
                    ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <ChevronLeft size={16} /> Previous Task
              </button>

              <div className="flex gap-1.5">
                {GUIDED_TASKS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTaskId(t.id)}
                    className={`w-8 h-8 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center cursor-pointer ${
                      activeTaskId === t.id
                        ? isHighContrast ? 'bg-yellow-400 text-black ring-2 ring-yellow-300' : 'bg-cyan-500 text-black font-black shadow-lg scale-105'
                        : completedTaskIds.includes(t.id)
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/5 text-white/60 border border-white/10'
                    }`}
                  >
                    {t.id}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={activeTaskId >= GUIDED_TASKS.length}
                onClick={() => setActiveTaskId(prev => Math.min(GUIDED_TASKS.length, prev + 1))}
                className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  activeTaskId >= GUIDED_TASKS.length
                    ? 'opacity-30 cursor-not-allowed bg-white/5 text-white/40'
                    : isHighContrast
                    ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                    : 'bg-cyan-500 text-black hover:bg-cyan-400 font-bold'
                }`}
              >
                Next Task <ChevronRight size={16} />
              </button>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP HEADER BANNER ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-50/80 via-blue-50/50 to-indigo-50/40 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-800/80 border border-sky-200/60 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/20 shrink-0">
              <Mic size={28} className="drop-shadow" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                Speech Biomarker Test
              </h2>
              <p className="text-sm text-foreground-muted font-medium mt-0.5">
                Guided voice tasks and automated multilingual acoustic speech transcription
              </p>
            </div>
          </div>

          {/* Header Right Actions: Language Selector */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface border border-sky-200/80 dark:border-slate-700 shadow-2xs">
              <Globe size={16} className="text-primary shrink-0" />
              <span className="text-xs font-bold text-foreground-muted shrink-0">Language:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-foreground focus:outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code} className="bg-surface text-foreground">
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── LIVE VOICE ASSESSMENT & GUIDED TASKS ──────────────────────────── */}
      <div className="space-y-4">
        {/* Guided Speech Task Selector & Patient Presentation Header */}
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare size={15} className="text-primary" /> Guided Speech Prompts
              <span className="text-[11px] font-mono text-foreground-muted font-normal">
                ({completedTaskIds.length}/{GUIDED_TASKS.length} Completed)
              </span>
            </h3>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPatientModalText(activeTask)}
                className="px-2.5 py-1 rounded-lg font-bold text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Maximize2 size={13} /> Present to Patient
              </button>

              {/* Task Checklist Badges */}
              <div className="flex gap-1">
                {GUIDED_TASKS.map(t => {
                  const isDone = completedTaskIds.includes(t.id)
                  const isActive = activeTaskId === t.id
                  const taskLoc = LOCALIZED_PROMPTS[selectedLanguage]?.[t.id]
                  const tooltipTitle = taskLoc?.title || t.title
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTaskId(t.id)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all border flex items-center justify-center cursor-pointer ${
                        isActive
                          ? 'bg-primary text-white border-primary shadow-2xs'
                          : isDone
                          ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                          : 'bg-background hover:bg-surface-hover text-foreground-muted border-border'
                      }`}
                      title={tooltipTitle}
                    >
                      {isDone && !isActive ? <CheckCircle2 size={12} /> : t.id}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Active Prompt Box */}
          <div className="p-3.5 rounded-xl bg-background border border-border/80 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary">Task {activeTask.id}: {mainTitle}</span>
                {completedTaskIds.includes(activeTask.id) && (
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 size={10} /> Completed
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground font-medium">{mainPrompt}</p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setPatientModalText(activeTask)}
                className="p-2 rounded-lg bg-surface border border-border text-foreground-muted hover:text-primary transition-colors cursor-pointer"
                title="Fullscreen Patient Mode"
              >
                <Maximize2 size={15} />
              </button>

              {activeTaskId < GUIDED_TASKS.length && (
                <button
                  type="button"
                  onClick={() => setActiveTaskId(prev => prev + 1)}
                  className="p-2 rounded-lg bg-surface border border-border text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
                  title="Next Prompt"
                >
                  <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Audio Recorder & Controls */}
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Mic size={15} className="text-primary" /> One-Tap Voice Recorder & Live Transcription
            </h3>

            {/* Granular Task Reset Actions */}
            <div className="flex items-center gap-2">
              {completedTaskIds.includes(activeTaskId) && (
                <button
                  type="button"
                  onClick={handleResetCurrentTask}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title={`Reset / Retake Task ${activeTaskId} Audio & Transcript`}
                >
                  <RotateCcw size={12} /> Reset Task {activeTaskId}
                </button>
              )}

              {(completedTaskIds.length > 0 || speechText || audioFile) && (
                <button
                  type="button"
                  onClick={handleResetAllAssessment}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Reset Entire Test Assessment (All Tasks & Transcripts)"
                >
                  <Trash2 size={12} /> Reset All Tasks
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            {/* Prominent Record & Playback Controls */}
            <div className="p-3.5 rounded-xl bg-background border border-border/80 flex items-center justify-between min-h-[58px]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleRecording}
                  className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-xs transition-all cursor-pointer ${
                    isRecording
                      ? 'bg-rose-500 text-white animate-pulse shadow-md'
                      : completedTaskIds.includes(activeTaskId)
                      ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-sm font-extrabold'
                      : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-sm'
                  }`}
                >
                  {isRecording ? <Square size={15} /> : completedTaskIds.includes(activeTaskId) ? <RotateCcw size={15} /> : <Mic size={15} />}
                  {isRecording
                    ? 'Stop Recording'
                    : completedTaskIds.includes(activeTaskId)
                    ? `Retake Task ${activeTaskId} Recording`
                    : `Start Task ${activeTaskId} Voice Test`}
                </button>
              </div>

              {/* Animated Waveform Visualizer or Replay Player */}
              {isRecording ? (
                <div className="flex items-center gap-1">
                  {[14, 28, 18, 36, 22, 30, 16, 26].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-rose-500 rounded-full animate-bounce"
                      style={{ height: `${h}px`, animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              ) : completedTaskIds.includes(activeTaskId) || lastRecordedTask === activeTaskId ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleReplayAudio}
                    className="px-3 py-1.5 rounded-lg bg-surface border border-border text-foreground hover:text-primary transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {isPlayingBack ? <Volume2 size={13} className="text-primary animate-pulse" /> : <Play size={13} />}
                    {isPlayingBack ? 'Playing...' : 'Listen Back'}
                  </button>
                </div>
              ) : (
                <div className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  High SNR
                </div>
              )}
            </div>

            {/* Audio File Dropzone */}
            <DropZone
              accept={{ 'audio/*': ['.mp3', '.wav', '.flac', '.ogg', '.webm'] }}
              label="Upload Audio File"
              hint="WAV, MP3, FLAC, OGG, or WEBM"
              file={audioFile}
              onFile={setAudioFile}
              onClear={() => setAudioFile(null)}
              type="audio"
            />
          </div>

          {/* Live Streaming Audio Indicator */}
          {isRecording && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs font-semibold text-rose-400 animate-pulse">
              <Activity size={14} />
              <span>Live Speech Analysis active ({SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.label})... Speak clearly into the microphone.</span>
            </div>
          )}

          {/* ── ALL RECORDINGS PLAYBACK PANEL ──────────────────────────────── */}
          {(Object.keys(taskAudios).length > 0) && (
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Volume2 size={14} className="text-primary" /> All Recorded Sessions
                  <span className="text-[11px] font-mono text-foreground-muted font-normal normal-case">
                    ({Object.keys(taskAudios).length} recording{Object.keys(taskAudios).length !== 1 ? 's' : ''})
                  </span>
                </h3>

                {/* Play All Button */}
                {Object.keys(taskAudios).length > 1 && (
                  <button
                    type="button"
                    onClick={handlePlayAllTasks}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      playingTaskId === 'all'
                        ? 'bg-primary text-white border-primary animate-pulse'
                        : 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
                    }`}
                  >
                    {playingTaskId === 'all'
                      ? <><VolumeX size={13} /> Stop All</>
                      : <><Play size={13} /> Play All ({Object.keys(taskAudios).length})</>
                    }
                  </button>
                )}
              </div>

              {/* Individual Task Recordings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {GUIDED_TASKS.filter(t => taskAudios[t.id]).map(t => {
                  const taskLoc = LOCALIZED_PROMPTS[selectedLanguage]?.[t.id]
                  const taskTitle = taskLoc?.title || t.title
                  const isThisPlaying = playingTaskId === t.id
                  return (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-all ${
                        isThisPlaying
                          ? 'bg-primary/10 border-primary/40'
                          : 'bg-background border-border/70 hover:border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                          isThisPlaying ? 'bg-primary text-white' : 'bg-emerald-500/15 text-emerald-500'
                        }`}>
                          {t.id}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{taskTitle}</p>
                          <p className="text-[10px] text-foreground-muted">Task {t.id} · Recorded</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePlayTaskAudio(t.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 border transition-colors cursor-pointer ${
                          isThisPlaying
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface border-border text-foreground hover:text-primary hover:border-primary/40'
                        }`}
                        title={isThisPlaying ? `Stop Task ${t.id}` : `Listen to Task ${t.id}`}
                      >
                        {isThisPlaying
                          ? <><Square size={11} /> Stop</>
                          : <><Play size={11} /> Listen</>
                        }
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
