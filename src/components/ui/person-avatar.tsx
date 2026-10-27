"use client";
import { useState } from "react";
import { personPhoto } from "@/lib/media";
export function PersonAvatar({
  name,
  size = 36,
}: {
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const src = personPhoto(name);
  return (
    <span
      className="person-avatar"
      style={{ width: size, height: size }}
      title={`${name} · demo profile`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={`${name} — demo profile photo`}
          width={size}
          height={size}
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-label={name}>
          {name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")}
        </span>
      )}
    </span>
  );
}
