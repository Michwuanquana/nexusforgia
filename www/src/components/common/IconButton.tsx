import { Icon } from './Icon';

interface IconButtonProps {
  icon: string;
  label?: string;
  title: string;
  active?: boolean;
  onClick: () => void;
  className?: string;
  danger?: boolean;
}

export function IconButton({
  icon,
  label,
  title,
  active = false,
  onClick,
  className = '',
  danger = false,
}: IconButtonProps) {
  const baseClasses = 'flex items-center gap-1.5 px-2 py-1 text-sm rounded transition-colors';
  const activeClasses = active
    ? 'bg-[var(--accent)] text-white'
    : danger
    ? 'bg-[var(--panel-border)] hover:bg-red-600'
    : 'bg-[var(--panel-border)] hover:bg-[var(--accent)]';

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${activeClasses} ${className}`}
      title={title}
    >
      <Icon name={icon} size={16} />
      {label && <span>{label}</span>}
    </button>
  );
}
