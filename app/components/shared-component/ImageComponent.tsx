import { memo, useState } from "react";
import { FALLBACK_AVATAR_PLACEHOLDER } from "~/constant/constant";

function ImageComponent({
  src,
  alt,
  className = "",
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  // NOTE: remote avatars are currently disabled (see `AVATARS_ENABLED`). Flip it
  // to true to serve `src`; the img is lazy + async-decoded so a long list only
  // pays for the rows actually on screen.
  const showRemote = AVATARS_ENABLED && !!src && !errored;

  return (
    <div
      className={`relative overflow-hidden h-[65px] w-[65px] rounded-full border border-primaryColor ${className}`}
    >
      <img
        src={FALLBACK_AVATAR_PLACEHOLDER}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {showRemote && (
        <img
          src={src!}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setErrored(true)}
          className="relative h-full w-full rounded-full object-cover"
        />
      )}
    </div>
  );
}

// Remote member photos are turned off for now — every list row rendered a second
// <img> with no src plus its own loading state, for a picture that never arrived.
const AVATARS_ENABLED = false;

export default memo(ImageComponent);
