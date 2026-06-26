import type { SupabaseClient } from '@supabase/supabase-js'

function mediaVideosBase(): string {
  const r2 = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, '')
  if (r2) return `${r2}/videos`
  // ponytail: fallback hasta migrar URLs en DB y desplegar con R2_PUBLIC_URL
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/videos`
}

export const DEFAULT_HOME_VIDEO_480 = `${mediaVideosBase()}/home-hero-480.mp4`

export const DEFAULT_HOME_VIDEO_1080 = `${mediaVideosBase()}/home-hero-1080.mp4`

export const DEFAULT_HOME_VIDEO_POSTER = `${mediaVideosBase()}/home-hero-poster.jpg`

export const DEFAULT_HOME_SHOWCASE_VIDEO = `${mediaVideosBase()}/video-web-1_1780812607384.mp4`

export type HomeVideoSettings = {
  video480: string
  video1080: string
  poster: string
}

export type HomePageVideos = HomeVideoSettings & {
  showcaseVideo: string
}

const SETTINGS_KEYS = [
  'home_video_480',
  'home_video_1080',
  'home_video_poster',
  'home_showcase_video',
] as const

export async function getHomeVideoSettings(
  supabase: SupabaseClient,
): Promise<HomeVideoSettings> {
  const all = await getHomePageVideos(supabase)
  return { video480: all.video480, video1080: all.video1080, poster: all.poster }
}

export async function getHomePageVideos(
  supabase: SupabaseClient,
): Promise<HomePageVideos> {
  const { data } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', [...SETTINGS_KEYS])

  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]))

  return {
    video480: map.home_video_480 || DEFAULT_HOME_VIDEO_480,
    video1080: map.home_video_1080 || DEFAULT_HOME_VIDEO_1080,
    poster: map.home_video_poster || DEFAULT_HOME_VIDEO_POSTER,
    showcaseVideo: map.home_showcase_video || DEFAULT_HOME_SHOWCASE_VIDEO,
  }
}
