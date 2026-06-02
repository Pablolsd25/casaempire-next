-- URLs del video de portada (editables desde admin → Configuración)
INSERT INTO site_settings (key, value)
VALUES
  ('home_video_480',  'https://video.wixstatic.com/video/d60565_a92a4ba089fb4a6d8e4893b90cef9183/480p/mp4/file.mp4'),
  ('home_video_1080', 'https://video.wixstatic.com/video/d60565_a92a4ba089fb4a6d8e4893b90cef9183/1080p/mp4/file.mp4')
ON CONFLICT (key) DO NOTHING;
