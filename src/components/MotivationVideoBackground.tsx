import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MOTIVATION_VIDEOS = Array.from({ length: 13 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return `/motivation/pushup-${number}.mp4`;
});

function shuffledVideos(): string[] {
  const videos = [...MOTIVATION_VIDEOS];
  for (let index = videos.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [videos[index], videos[swapIndex]] = [videos[swapIndex], videos[index]];
  }
  return videos;
}

const MotivationVideoBackground: React.FC = () => {
  const queueRef = useRef<string[]>([]);
  const firstVideoRef = useRef<HTMLVideoElement | null>(null);
  const secondVideoRef = useRef<HTMLVideoElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sources, setSources] = useState<[string, string]>(() => {
    const firstQueue = shuffledVideos();
    queueRef.current = firstQueue.slice(2);
    return [firstQueue[0], firstQueue[1]];
  });

  const inactiveIndex = activeIndex === 0 ? 1 : 0;
  const videoRefs = useMemo(() => [firstVideoRef, secondVideoRef], []);

  const nextSource = useCallback(() => {
    if (queueRef.current.length === 0) {
      queueRef.current = shuffledVideos();
    }
    return queueRef.current.shift() ?? MOTIVATION_VIDEOS[0];
  }, []);

  const playActiveVideo = useCallback(() => {
    const video = videoRefs[activeIndex].current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    void video.play().catch(() => undefined);
  }, [activeIndex, videoRefs]);

  const preloadInactiveVideo = useCallback(() => {
    const video = videoRefs[inactiveIndex].current;
    if (!video) return;
    video.load();
  }, [inactiveIndex, videoRefs]);

  const swapVideo = useCallback(() => {
    const nextIndex = activeIndex === 0 ? 1 : 0;
    const nextVideo = videoRefs[nextIndex].current;
    const oldVideo = videoRefs[activeIndex].current;

    if (oldVideo) oldVideo.pause();
    if (nextVideo) {
      nextVideo.currentTime = 0;
      nextVideo.muted = false;
      nextVideo.volume = 1;
      void nextVideo.play().catch(() => undefined);
    }

    setActiveIndex(nextIndex);
    setSources((current) => {
      const updated: [string, string] = [...current] as [string, string];
      updated[activeIndex] = nextSource();
      return updated;
    });
  }, [activeIndex, nextSource, videoRefs]);

  useEffect(() => {
    playActiveVideo();
  }, [playActiveVideo]);

  useEffect(() => {
    preloadInactiveVideo();
  }, [preloadInactiveVideo, sources]);

  const videos = useMemo(
    () =>
      sources.map((source, index) => (
        <video
          key={index}
          ref={videoRefs[index]}
          className={`pushupsMotivationVideo${index === activeIndex ? " active" : ""}`}
          src={source}
          playsInline
          preload="auto"
          onEnded={index === activeIndex ? swapVideo : undefined}
          aria-hidden="true"
        />
      )),
    [activeIndex, sources, swapVideo, videoRefs]
  );

  return <div className="pushupsMotivationLayer">{videos}</div>;
};

export default MotivationVideoBackground;
