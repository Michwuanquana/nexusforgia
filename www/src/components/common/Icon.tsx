interface IconProps {
  name: string;
  size?: number;
  className?: string;
  title?: string;
}

export function Icon({ name, size = 16, className = '', title }: IconProps) {
  return (
    <img
      src={`/icons/${name}.png`}
      alt={title || name}
      title={title}
      width={size}
      height={size}
      className={`inline-block ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
