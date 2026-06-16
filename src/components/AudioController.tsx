import { useEffect, useRef } from "react";
import type { AudioEngine } from "../lib/audio";
import { BINAURAL_PRESETS } from "../lib/audio";
import { youtubeId } from "../lib/format";
import type { AudioConfig } from "../types";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

const GENERATED = ["white", "pink", "brown", "binaural"];

export function AudioController({
  engine,
  cfg,
  active,
}: {
  engine: AudioEngine;
  cfg: AudioConfig;
  active: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const ytHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  const isYouTube = cfg.source === "youtube";
  const isMedia = cfg.source === "podcast" || cfg.source === "media";
  const vid = isYouTube ? youtubeId(cfg.url) : null;

  // Master volume for generated tones.
  useEffect(() => {
    engine.setVolume(cfg.volume);
  }, [cfg.volume, engine]);

  // Generated tones (noise / binaural).
  useEffect(() => {
    if (!GENERATED.includes(cfg.source)) {
      engine.stopTone();
      return;
    }
    if (active) {
      engine.resume();
      if (cfg.source === "binaural") {
        const p = BINAURAL_PRESETS[cfg.preset];
        engine.playBinaural(p.base, p.beat);
      } else {
        engine.playNoise(cfg.source as "white" | "pink" | "brown");
      }
    } else {
      engine.stopTone();
    }
    return () => engine.stopTone();
  }, [cfg.source, cfg.preset, active, engine]);

  // HTML media element (podcast / media URL).
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !isMedia) return;
    el.volume = cfg.volume;
  }, [cfg.volume, isMedia]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !isMedia) return;
    if (active) el.play().catch(() => {});
    else el.pause();
  }, [active, isMedia, cfg.url]);

  // YouTube player.
  useEffect(() => {
    if (!isYouTube || !vid) {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          /* noop */
        }
        playerRef.current = null;
      }
      return;
    }
    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !ytHostRef.current) return;
      if (playerRef.current) {
        playerRef.current.loadVideoById(vid);
        return;
      }
      playerRef.current = new window.YT.Player(ytHostRef.current, {
        videoId: vid,
        playerVars: { autoplay: 0, controls: 1, playsinline: 1, rel: 0 },
        events: {
          onReady: (e: any) => {
            e.target.setVolume(Math.round(cfg.volume * 100));
            if (active) e.target.playVideo();
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isYouTube, vid]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p || !isYouTube) return;
    if (active && p.playVideo) p.playVideo();
    else if (p.pauseVideo) p.pauseVideo();
  }, [active, isYouTube]);

  useEffect(() => {
    const p = playerRef.current;
    if (p?.setVolume) p.setVolume(Math.round(cfg.volume * 100));
  }, [cfg.volume]);

  return (
    <div className={isYouTube && vid ? "neu-inset overflow-hidden p-2" : ""}>
      {isYouTube && vid && (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-screen">
          <div ref={ytHostRef} className="h-full w-full" />
        </div>
      )}
      {isMedia && cfg.url && (
        <audio ref={audioRef} src={cfg.url} preload="none" className="hidden" />
      )}
    </div>
  );
}
