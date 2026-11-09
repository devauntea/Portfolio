"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CAMERA_ROLL, DESK } from "@/data/profile";

const photos = CAMERA_ROLL.filter((photo) => photo.src);
export function CameraRoll({
  pocket = false,
  onClose,
}: {
  pocket?: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const photo = photos[index];
  const next = (direction: number) =>
    setIndex(
      (current) => (current + direction + photos.length) % photos.length,
    );
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    element.focus({ preventScroll: true });
    let accumulated = 0,
      lastChange = 0;
    const wheel = (event: WheelEvent) => {
      if ((event.target as HTMLElement).closest(".camera-filmstrip")) return;
      event.preventDefault();
      event.stopPropagation();
      if (performance.now() - lastChange < 420) return;
      accumulated += event.deltaY;
      if (Math.abs(accumulated) < 45) return;
      const direction = Math.sign(accumulated);
      setIndex(
        (current) => (current + direction + photos.length) % photos.length,
      );
      accumulated = 0;
      lastChange = performance.now();
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, []);
  return (
    <div
      ref={root}
      className={`camera-roll ${pocket ? "camera-roll--pocket" : ""}`}
      role="region"
      aria-label={DESK.camera.title}
      tabIndex={0}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (
          [
            "ArrowRight",
            "ArrowDown",
            "ArrowLeft",
            "ArrowUp",
            "Home",
            "End",
          ].includes(event.key)
        ) {
          event.preventDefault();
          event.stopPropagation();
          if (event.key === "Home") setIndex(0);
          else if (event.key === "End") setIndex(photos.length - 1);
          else next(["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1);
        }
      }}
    >
      <header>
        <span>▷ {DESK.camera.counter}</span>
        <span>
          {String(index + 1).padStart(2, "0")} /{" "}
          {String(photos.length).padStart(2, "0")}
        </span>
        {pocket && (
          <button onClick={onClose} aria-label={DESK.camera.close}>
            ×
          </button>
        )}
      </header>
      <div className="camera-photo">
        <Image
          key={photo.id}
          src={photo.src!}
          alt={photo.title}
          fill
          sizes={pocket ? "90vw" : "720px"}
          loading="eager"
        />
        <button
          className="camera-prev"
          onClick={() => next(-1)}
          aria-label={DESK.camera.previous}
        >
          ‹
        </button>
        <button
          className="camera-next"
          onClick={() => next(1)}
          aria-label={DESK.camera.next}
        >
          ›
        </button>
      </div>
      <div className="camera-caption" aria-live="polite">
        <strong>{photo.title}</strong>
        <span>{photo.date}</span>
        <p>{photo.story}</p>
      </div>
      <nav className="camera-filmstrip" aria-label={DESK.camera.label}>
        {photos.map((frame, i) => (
          <button
            key={frame.id}
            onClick={() => setIndex(i)}
            aria-label={frame.title}
            aria-current={index === i ? "true" : undefined}
          >
            <Image
              src={frame.src!}
              alt=""
              width={68}
              height={44}
              sizes="68px"
              loading={pocket ? "lazy" : "eager"}
            />
            <span>{String(i + 1).padStart(2, "0")}</span>
          </button>
        ))}
      </nav>
      <footer>{pocket ? DESK.camera.pocketHint : DESK.camera.hint}</footer>
    </div>
  );
}
