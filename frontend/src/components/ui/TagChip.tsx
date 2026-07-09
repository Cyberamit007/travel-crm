import { Tag } from '../../types/index';
import { X } from 'lucide-react';

interface TagChipProps {
  tag: Tag;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 99, g: 102, b: 241 };
}

export default function TagChip({ tag, onRemove, size = 'sm' }: TagChipProps) {
  const { r, g, b } = hexToRgb(tag.color);
  const bg = `rgba(${r},${g},${b},0.12)`;
  const border = `rgba(${r},${g},${b},0.3)`;
  const text = tag.color;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-medium flex-shrink-0"
      style={{
        backgroundColor: bg,
        border: `1px solid ${border}`,
        color: text,
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
        fontSize: size === 'sm' ? '11px' : '12px',
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 rounded-full hover:opacity-70 transition-opacity"
          aria-label={`Remove ${tag.name}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
