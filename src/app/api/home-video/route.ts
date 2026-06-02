import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  DEFAULT_HOME_VIDEO_480,
  DEFAULT_HOME_VIDEO_1080,
  DEFAULT_HOME_SHOWCASE_VIDEO,
  getHomePageVideos,
} from '@/lib/home-video'

/** GET /api/home-video — URLs de videos de la página principal */
export async function GET() {
  try {
    const supabase = createAdminClient()
    const settings = await getHomePageVideos(supabase)
    return NextResponse.json(settings, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({
      video480: DEFAULT_HOME_VIDEO_480,
      video1080: DEFAULT_HOME_VIDEO_1080,
      showcaseVideo: DEFAULT_HOME_SHOWCASE_VIDEO,
    })
  }
}
