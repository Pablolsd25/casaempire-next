INSERT INTO site_settings (key, value)
VALUES (
  'home_showcase_video',
  'https://video.wixstatic.com/video/5cd3e7_a1bdec1e652044e2bae0b70b3d022289/720p/mp4/file.mp4'
)
ON CONFLICT (key) DO NOTHING;
