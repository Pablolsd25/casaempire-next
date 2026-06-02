"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = { videoUrl: string };

export default function VideoShowcase({ videoUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;

    const handleInteraction = () => {
      v.play().catch(() => {});
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("pointerdown", handleInteraction);
    };

    document.addEventListener("click", handleInteraction);
    document.addEventListener("pointerdown", handleInteraction);

    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("pointerdown", handleInteraction);
    };
  }, []);

  function unmute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setMuted(false);
    if (v.paused) {
      v.play().catch(() => {
        v.muted = true;
        setMuted(true);
      });
    }
  }

  function mute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    setMuted(true);
    if (v.paused) {
      v.play().catch(() => {});
    }
  }

  return (
    <section className="bg-black py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-accent text-xs font-display uppercase tracking-[0.3em] mb-3">
            Empire Nutrition
          </p>
          <h2 className="text-white font-display font-bold text-3xl sm:text-5xl uppercase tracking-tight leading-none">
            Alcanza tu <span className="text-accent">Máximo Potencial</span>
          </h2>
          <p className="text-zinc-500 mt-4 text-sm sm:text-base max-w-md mx-auto">
            Suplementos diseñados para llevarte al siguiente nivel
          </p>
        </div>

        {/* Video con hover-to-unmute */}
        <div
          className="relative rounded-xl overflow-hidden border border-accent/30
            shadow-[0_0_60px_rgba(35,243,14,0.12)] cursor-pointer"
          onMouseEnter={unmute}
          onMouseLeave={mute}
        >
          <video
            ref={videoRef}
            className="w-full aspect-video object-cover"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src={videoUrl} type="video/mp4" />
          </video>

          {/* Indicador de audio */}
          <div
            className="absolute bottom-4 right-4 z-10 flex items-center gap-2
            bg-black/60 backdrop-blur-sm border border-zinc-700 rounded-full px-3 py-1.5
            transition-all duration-300"
          >
            {muted ? (
              <>
                <svg
                  className="w-4 h-4 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                </svg>
                <span className="text-zinc-400 text-[10px] font-display uppercase tracking-wider hidden sm:inline">
                  Pasa el cursor
                </span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 text-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M15.536 8.464a5 5 0 010 7.072M12 6.253v11.494m0 0l-4.414-4.415H4a1 1 0 01-1-1V11.67a1 1 0 011-1h3.586L12 6.253z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M18.364 5.636a9 9 0 010 12.728"
                  />
                </svg>
                <span className="text-accent text-[10px] font-display uppercase tracking-wider hidden sm:inline animate-pulse">
                  Sonido activado
                </span>
              </>
            )}
          </div>
        </div>

        <div className="text-center mt-10">
          <Link
            href="/tienda"
            className="btn-accent inline-block px-12 py-3.5 rounded-sm text-sm tracking-wider"
          >
            Ver Tienda Completa
          </Link>
        </div>
      </div>
    </section>
  );
}
