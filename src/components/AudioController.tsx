import { useEffect, useRef } from "react";
import type { AudioEngine } from "../lib/audio";
import { youtubeId } from "../lib/format";
import type { SoundConfig } from "../types";

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
  sound,
  running,
  muted,
}: {
  engine: AudioEngine;
  /** The sound to play right now — the focus sound, or the break sound while a
   *  break is active and a separate one is configured (chosen by RunScreen). */
  sound: SoundConfig;
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

  const isYouTube = sound.category === "media" && sound.media.kind === "youtube";
  const isMedia =
    sound.category === "media" &&
    (sound.media.kind === "podcast" || sound.media.kind === "url");
  const vid = isYouTube ? youtubeId(sound.media.url) : null;

  // Latest designs, read by the start/stop effect without re-triggering it.
  const noiseRef = useRef(sound.noise);
  noiseRef.current = sound.noise;
  const binauralRef = useRef(sound.binaural);
  binauralRef.current = sound.binaural;
  const n = sound.noise;
  // Serialized binaural design — drives the live-reschedule effect.
  const binauralKey = JSON.stringify(sound.binaural);

  // Master volume for generated tones.
  useEffect(() => {
    engine.setVolume(sound.volume);
  }, [sound.volume, engine]);

  // Start / stop generated tones on category or run state. The tone stays
  // alive across breaks; the break "mute" is a crossfade (see the duck effect).
  // When the effective sound swaps between two same-category sounds (focus ⇄
  // break), category doesn't change here — the live effects below morph instead.
  useEffect(() => {
    const generated = sound.category === "noise" || sound.category === "binaural";
    if (!generated) {
      engine.stopTone();
      return;
    }
    if (running) {
      engine.resume();
      if (sound.category === "binaural") engine.playBinauralTrack(binauralRef.current);
      else engine.playNoiseBlend(noiseRef.current);
    } else {
      engine.stopTone();
    }
    return () => engine.stopTone();
  }, [sound.category, running, engine]);

  // Crossfade generated tones in/out as breaks mute audio.
  useEffect(() => {
    if (sound.category === "noise" || sound.category === "binaural") {
      engine.duck(muted);
    }
  }, [sound.category, muted, running, engine]);

  // Live noise-blend updates (X/Y pad, filter, volume, focus⇄break swap) —
  // no restart/click.
  useEffect(() => {
    if (sound.category === "noise" && running) engine.playNoiseBlend(n);
  }, [
    sound.category,
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

  // Live binaural reschedule on edit or focus⇄break swap — no restart/click.
  useEffect(() => {
    if (sound.category === "binaural" && running) {
      engine.playBinauralTrack(binauralRef.current);
    }
  }, [sound.category, running, engine, binauralKey]);

  // HTML media element (podcast / media URL).
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !isMedia) return;
    el.volume = sound.volume;
  }, [sound.volume, isMedia]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !isMedia) return;
    if (active) el.play().catch(() => {});
    else el.pause();
  }, [active, isMedia, sound.media.url]);

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
            e.target.setVolume(Math.round(sound.volume * 100));
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
    if (p?.setVolume) p.setVolume(Math.round(sound.volume * 100));
  }, [sound.volume]);

  return (
    <div className={isYouTube && vid ? "neu-inset overflow-hidden p-2" : ""}>
      {isYouTube && vid && (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-screen">
          <div ref={ytHostRef} className="h-full w-full" />
        </div>
      )}
      {isMedia && sound.media.url && (
        <audio ref={audioRef} src={sound.media.url} preload="none" className="hidden" />
      )}
    </div>
  );
}
