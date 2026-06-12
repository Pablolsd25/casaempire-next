"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { DEFAULT_HOME_VIDEO_POSTER, type HomeVideoSettings } from "@/lib/home-video";

type Props = HomeVideoSettings & { poster?: string };

export default function VideoHero({ video480, video1080, poster = DEFAULT_HOME_VIDEO_POSTER }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.load();
    v.play().catch(() => {});
  }, [video480, video1080]);

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-black">
      {/* Video de fondo */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        playsInline
        preload="metadata"
        poster={poster}
      >
        <source src={video1080} type="video/mp4" media="(min-width: 768px)" />
        <source src={video480} type="video/mp4" />
      </video>

      {/* Gradiente */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

      {/* Contenido */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/tienda"
            className="btn-accent px-10 py-3 rounded-sm text-base"
          >
            Ver Tienda
          </Link>
          <Link
            href="/ofertas"
            className="border border-accent text-accent font-display font-semibold px-10 py-3 rounded-sm text-base uppercase tracking-wide hover:bg-accent hover:text-black transition-all"
          >
            Nuestras Ofertas
          </Link>
        </div>
      </div>
    </section>
  );
}
