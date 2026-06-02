import type { SupabaseClient } from '@supabase/supabase-js'

export const DEFAULT_HOME_VIDEO_480 =
  'https://video.wixstatic.com/video/d60565_a92a4ba089fb4a6d8e4893b90cef9183/480p/mp4/file.mp4'

export const DEFAULT_HOME_VIDEO_1080 =
  'https://video.wixstatic.com/video/d60565_a92a4ba089fb4a6d8e4893b90cef9183/1080p/mp4/file.mp4'

export const DEFAULT_HOME_VIDEO_POSTER =
  'https://static.wixstatic.com/media/d60565_a92a4ba089fb4a6d8e4893b90cef9183f001.jpg/v1/fill/w_1920,h_419,al_c,q_85/d60565_a92a4ba089fb4a6d8e4893b90cef9183f001.jpg'

export const DEFAULT_HOME_SHOWCASE_VIDEO =
  'https://video.wixstatic.com/video/5cd3e7_a1bdec1e652044e2bae0b70b3d022289/720p/mp4/file.mp4'

export type HomeVideoSettings = {
  video480: string
  video1080: string
}

export type HomePageVideos = HomeVideoSettings & {
  showcaseVideo: string
}

const SETTINGS_KEYS = [
  'home_video_480',
  'home_video_1080',
  'home_showcase_video',
] as const

export async function getHomeVideoSettings(
  supabase: SupabaseClient
): Promise<HomeVideoSettings> {
  const all = await getHomePageVideos(supabase)
  return { video480: all.video480, video1080: all.video1080 }
}

export async function getHomePageVideos(
  supabase: SupabaseClient
): Promise<HomePageVideos> {
  const { data } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', [...SETTINGS_KEYS])

  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]))

  return {
    video480: map.home_video_480 || DEFAULT_HOME_VIDEO_480,
    video1080: map.home_video_1080 || DEFAULT_HOME_VIDEO_1080,
    showcaseVideo: map.home_showcase_video || DEFAULT_HOME_SHOWCASE_VIDEO,
  }
}
