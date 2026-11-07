"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { TapeProgress } from "@/lib/jobs/tape-stages";
import { cn } from "@/lib/cn";

// The tape has exactly two jobs: counting down an open invoice and showing job progress.
// It is drawn as inline SVG (no image files) and is never decoration.

const TAPE_HEIGHT = 36;
const TICK_SHORT = 8;
const TICK_TALL = 16;
const TICK_EVERY = 8;
const NUMBER_EVERY = 40;
// Wide enough for any desktop screen; the strip clips it to its own width.
const TAPE_DRAW_WIDTH = 2400;

function Ticks() {
  const ticks = Array.from({ length: TAPE_DRAW_WIDTH / TICK_EVERY }, (_, index) => index);
  return (
    <svg
      aria-hidden
      width={TAPE_DRAW_WIDTH}
      height={TAPE_HEIGHT}
      className="pointer-events-none absolute top-0 left-0 max-w-none"
    >
      {ticks.map((index) => {
        const x = index * TICK_EVERY + 0.75;
        const tall = (index * TICK_EVERY) % NUMBER_EVERY === 0;
        return (
          <g key={index}>
            <line
              x1={x}
              x2={x}
              y1={TAPE_HEIGHT}
              y2={TAPE_HEIGHT - (tall ? TICK_TALL : TICK_SHORT)}
              stroke="var(--ink)"
              strokeWidth={1.5}
            />
            {tall && (
              <text
                x={x + 3}
                y={TAPE_HEIGHT - TICK_TALL - 3}
                fontSize={12}
                fill="var(--ink)"
                className="font-display font-semibold"
              >
                {(index * TICK_EVERY) / NUMBER_EVERY}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Ticks once a second on the client. The server snapshot is null so the first paint matches
// the server's HTML and hydration never disagrees about what time it is.
function subscribe(callback: () => void) {
  const timer = setInterval(callback, 1000);
  return () => clearInterval(timer);
}
const nowInSeconds = () => Math.floor(Date.now() / 1000);
const serverNow = () => null;

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

type CountdownTapeProps = {
  mode: "countdown";
  expiresAt: string;
  durationSeconds?: number;
  onExpire?: () => void;
};

type ProgressTapeProps = {
  mode: "progress";
  progress: TapeProgress;
};

export function Tape(props: CountdownTapeProps | ProgressTapeProps) {
  return props.mode === "countdown" ? <CountdownTape {...props} /> : <ProgressTape {...props} />;
}

function CountdownTape({ expiresAt, durationSeconds = 900, onExpire }: CountdownTapeProps) {
  const now = useSyncExternalStore(subscribe, nowInSeconds, serverNow);
  const expiresAtSeconds = Math.floor(new Date(expiresAt).getTime() / 1000);
  const remaining = now === null ? durationSeconds : Math.max(0, expiresAtSeconds - now);
  const fraction = Math.min(1, remaining / durationSeconds);
  const expired = now !== null && remaining === 0;

  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });
  useEffect(() => {
    if (expired) onExpireRef.current?.();
  }, [expired]);

  // Derived, not stored: the text only changes when the minute does, so screen readers hear
  // it once a minute instead of every second.
  const minutesLeft = Math.ceil(remaining / 60);
  const spoken =
    now === null
      ? ""
      : expired
        ? "This invoice expired."
        : `${minutesLeft} ${minutesLeft === 1 ? "minute" : "minutes"} left to pay.`;

  return (
    <div>
      <div className="bg-ground relative h-9 w-full">
        <div
          className="rounded-tape bg-tape absolute inset-y-0 left-0 overflow-hidden transition-[width] duration-1000 ease-linear"
          style={{ width: `${fraction * 100}%` }}
        >
          <Ticks />
        </div>
      </div>
      <p className="text-small text-ink px-4 pt-2 font-semibold tabular-nums">
        {expired
          ? "Expired"
          : now === null
            ? "Pay within 15:00"
            : `Pay within ${formatClock(remaining)}`}
      </p>
      <p role="status" className="sr-only">
        {spoken}
      </p>
    </div>
  );
}

function ProgressTape({ progress }: ProgressTapeProps) {
  const count = progress.stages.length;
  const cancelled = progress.kind === "cancelled";
  return (
    <div>
      <div
        className={cn(
          "rounded-tape bg-tape relative h-9 w-full overflow-hidden",
          cancelled && "opacity-40",
        )}
      >
        <Ticks />
        {progress.stages.map((stage, index) => {
          const isCurrent = progress.kind === "active" && progress.current.key === stage.key;
          const left = ((index + 0.5) / count) * 100;
          return (
            <span
              key={stage.key}
              aria-hidden
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${left}%` }}
            >
              {isCurrent ? (
                // The pin: an ink disc with the stage number in the tape color.
                <span className="bg-ink font-display text-small text-tape mt-1 flex size-6 items-center justify-center rounded-full font-extrabold">
                  {stage.number}
                </span>
              ) : (
                <span className="border-ink font-display text-small text-ink mt-1 flex size-6 items-center justify-center rounded-full border-[1.5px] font-semibold">
                  {stage.number}
                </span>
              )}
            </span>
          );
        })}
      </div>
      <ol className="flex px-0 pt-2">
        {progress.stages.map((stage) => {
          const isCurrent = progress.kind === "active" && progress.current.key === stage.key;
          return (
            <li
              key={stage.key}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "text-small flex-1 text-center",
                isCurrent ? "text-ink font-semibold" : "text-ink-soft",
              )}
            >
              {stage.label}
            </li>
          );
        })}
      </ol>
      <p className="text-small text-ink px-4 pt-2 font-semibold">{progress.text}</p>
    </div>
  );
}
