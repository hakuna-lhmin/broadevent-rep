// src/types/index.ts

export type Region   = 'domestic' | 'international' | 'all'
export type Country  = 'domestic' | 'international'        // ← 공통 export 추가
export type EventType   = 'seminar' | 'panel' | 'forum' | 'conference' | 'exhibition' | 'tradeshow' | 'other'
export type SearchPeriod = '3m' | '6m' | '1y' | 'custom'
export type ReportType   = 'seminar' | 'exhibition'

export interface InterestFilter {
  regions: Region[]
  orgs: string[]
  orgCustom: string
  eventTypes: string[]
  eventTypeCustom: string
  period: SearchPeriod
  customStart?: string
  customEnd?: string
  keyword: string
}

export interface EventFile {
  name: string
  url: string
  uploadedAt: string
}

export interface BoothEntry {
  id: string
  photos: EventFile[]
  companyName: string
  consultationNotes: string
  keyPoints: string
}

export interface BroadEvent {
  id: string
  name: string
  startDate: string
  endDate: string
  location: string
  url: string
  country: Country
  source: 'ai_search' | 'manual' | 'ocr'
  paperFile?: EventFile
  meetingResultFile?: EventFile
  reportFile?: EventFile
  newsSummary?: string
  seminarReport?: SeminarReportData
  exhibitionReport?: ExhibitionReportData
  createdAt: string
}

export interface SeminarReportData {
  eventName: string
  homepageDescUrl: string
  paperFileName: string
  meetingResultFileName: string
  photos: EventFile[]
  overallComments: string
  customRequirements: string
  useCustomRequirements: boolean
  titleFontSize: number
  subtitleFontSize: number
  bodyFontSize: number
  totalPages: number
}

export interface ExhibitionReportData {
  eventName: string
  homepageDescUrl: string
  booths: BoothEntry[]
  overallComments: string
  customRequirements: string
  useCustomRequirements: boolean
  titleFontSize: number
  subtitleFontSize: number
  bodyFontSize: number
  totalPages: number
}

export interface UserProfile {
  uid: string
  name: string
  email: string
  interests: InterestFilter
  savedAt?: string
}

export interface OcrResult {
  name: string
  startDate: string
  endDate: string
  location: string
  url: string
  country: string
}

export interface AiSearchResult {
  name: string
  startDate: string
  endDate: string
  location: string
  url: string
  country: string
  summary: string
}
