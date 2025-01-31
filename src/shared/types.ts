import type { CHAT_PROVIDER_ID, STT_PROVIDER_ID } from "."

export type RecordingHistoryItem = {
  id: string
  createdAt: number
  duration: number
  transcript: string
}

export type Config = {
  shortcut?: "hold-ctrl" | "ctrl-slash"
  hideDockIcon?: boolean

  sttProviderId?: STT_PROVIDER_ID

  openaiApiKey?: string
  openaiBaseUrl?: string

  groqApiKey?: string
  groqBaseUrl?: string

  geminiApiKey?: string
  geminiBaseUrl?: string

  siliconflowApiKey?: string
  siliconflowBaseUrl?: string
  siliconflowModel?: string

  assemblyaiApiKey?: string
  assemblyaiBaseUrl?: string
  assemblyaiLanguageDetection?: boolean
  assemblyaiLanguageConfidenceThreshold?: number

  transcriptPostProcessingEnabled?: boolean
  transcriptPostProcessingProviderId?: CHAT_PROVIDER_ID
  transcriptPostProcessingPrompt?: string
}
