import { CSSProperties } from "react";

interface Props {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function PonsbloomMark({ size = 22, className, style }: Props) {
  return (
    <img
      src="/logo-ponsbloom.png"
      width={size}
      height={size}
      alt="Ponsbloom"
      className={className}
      style={{ display: "block", objectFit: "contain", ...style }}
      draggable={false}
    />
  );
}
