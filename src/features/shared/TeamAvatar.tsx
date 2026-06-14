import { useState } from "react";

type TeamAvatarProps = {
  emoji: string;
  image: string;
  name: string;
  className?: string;
};

export function TeamAvatar({ emoji, image, name, className }: TeamAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className={`team-avatar ${className ?? ""}`}>
      {image && !imageFailed ? (
        <img src={image} alt={name} onError={() => setImageFailed(true)} />
      ) : (
        <span>{emoji}</span>
      )}
    </div>
  );
}
