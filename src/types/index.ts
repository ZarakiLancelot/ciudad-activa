export type ReportCategory = 'pothole' | 'accident' | 'lighting' | 'water' | 'trash' | 'other'

export type ReportStatus = 'pending' | 'in_progress' | 'resolved'

export interface Municipality {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface Profile {
  id: string
  display_name: string | null
  is_anonymous: boolean
  municipality_id: string
  created_at: string
}

export interface Report {
  id: string
  title: string
  description: string | null
  category: ReportCategory
  status: ReportStatus
  photo_url: string | null
  lat: number
  lng: number
  address: string | null
  user_id: string | null
  municipality_id: string
  created_at: string
  profile?: Pick<Profile, 'display_name' | 'is_anonymous'>
  _affected_count?: number
}

export interface Affected {
  id: string
  report_id: string
  user_id: string | null
  created_at: string
}
