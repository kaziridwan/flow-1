import { useEffect, useRef } from "react";
import type { AudioEngine } from "../lib/audio";
import { youtubeId } from "../lib/format";
import type { AudioSettings } from "../types";

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

export function AudioController({
  engine,
  cfg,
  running,
  muted,
}: {
  engine: AudioEngine;
  cfg: AudioSettings;
  /** The run is playing (status === running) — synthesised tones stay alive. */
  running: boolean;
  /** Current block mutes audio (a break with pauseOnBreak) — crossfade out. */
  muted: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const ytHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  // Media (YouTube / <audio>) can't crossfade — they just play when audible.
  const active = running && !muted;

  const isYouTube = cfg.category === "media" && cfg.media.kind === "youtube";
  const isMedia =
    cfg.category === "media" &&
    (cfg.media.kind === "podcast" || cfg.media.kind === "url");
  const vid = isYouTube ? youtubeId(cfg.media.url) : null;

  // Latest designs, read by the start/stop effect without re-triggering it.
  const noiseRef = useRef(cfg.noise);
  noiseRef.current = cfg.noise;
  const binauralRef = useRef(cfg.binaural);
  binauralRef.current = cfg.binaural;
  const n = cfg.noise;
  // Serialized binaural design — drives the live-reschedule effect.
  const binauralKey = JSON.stringify(cfg.binaural);

  // Master volume for generated tones.
  useEffect(() => {
    engine.setVolume(cfg.volume);
  }, [cfg.volume, engine]);

  // Start / stop generated tones on category or run state. The tone stays
  // alive across breaks; the break "mute" is a crossfade (see the duck effect).
  useEffect(() => {
    const generated = cfg.category === "noise" || cfg.category === "binaural";
    if (!generated) {
      engine.stopTone();
      return;
    }
    if (running) {
      engine.resume();
      if (cfg.category === "binaural") engine.playBinauralTrack(binauralRef.current);
      else engine.playNoiseBlend(noiseRef.current);
    } else {
      engine.stopTone();
    }
    return () => engine.stopTone();
  }, [cfg.category, running, engine]);

  // Crossfade generated tones in/out as breaks mute audio.
  useEffect(() => {
    if (cfg.category === "noise" || cfg.category === "binaural") {
      engine.duck(muted);
    }
  }, [cfg.category, muted, running, engine]);

  // Live noise-blend updates (X/Y pad, filter, volume) — no restart/click.
  useEffect(() => {
    if (cfg.category === "noise" && running) engine.playNoiseBlend(n);
  }, [
    cfg.category,
    running,
    engine,
    n,
    n.blend.x,
    n.blend.y,
    n.lowpass.enabled,
    n.lowpass.cutoff,
    n.lowpass.q,
    n.volume,
  ]);

  // Live binaural reschedule when the track is edited — no restart/click.
  useEffect(() => {
    if (cfg.category === "binaural" && running) {
      engine.playBinauralTrack(binauralRef.current);
    }
  }, [cfg.category, running, engine, binauralKey]);

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
  }, [active, isMedia, cfg.media.url]);

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
      {isMedia && cfg.media.url && (
        <audio ref={audioRef} src={cfg.media.url} preload="none" className="hidden" />
      )}
    </div>
  );
}
