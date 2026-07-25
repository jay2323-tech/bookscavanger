"use client";

import { useState } from "react";

type Props = {
  src?: string | null;
  title: string;
  className?: string;
};

export default function BookCover({ src, title, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(src) && !failed;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-bs-teal-soft to-bs-paper border border-bs-line shadow-sm ${className}`}
      style={{ width: 72, height: 108 }}
      aria-hidden={!showImg}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col justify-between p-2">
          <span
            className="text-[10px] leading-tight text-bs-ink line-clamp-4 font-medium"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            {title}
          </span>
          <span className="text-[8px] uppercase tracking-wider text-bs-teal">
            BookScavenger
          </span>
        </div>
      )}
    </div>
  );
}
