import Image from "next/image";
import styles from "./pixel-sprite.module.css";

const sprites = {
  welcome: { width: 55, height: 144 },
  printer: { width: 73, height: 66 },
  kiosk: { width: 75, height: 65 },
  paper: { width: 46, height: 48 },
  tip: { width: 60, height: 92 },
};

export function PixelSprite({ kind, className, loading }: {
  kind: keyof typeof sprites;
  className?: string;
  loading?: "eager" | "lazy";
}) {
  return (
    <Image
      alt=""
      className={className ? `${styles.sprite} ${className}` : styles.sprite}
      src={`/images/copyhouse-${kind}.png`}
      {...sprites[kind]}
      loading={loading}
      unoptimized
    />
  );
}
