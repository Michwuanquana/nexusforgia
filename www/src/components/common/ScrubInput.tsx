import { useState, useRef, useCallback, useEffect } from 'react';

interface ScrubInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
}

/**
 * Numeric input with Photoshop-style drag-to-change behavior.
 * Click and drag horizontally on the label to scrub the value.
 */
export function ScrubInput({
  value,
  onChange,
  placeholder = '',
  min,
  max,
  step = 1,
  label,
  className = '',
}: ScrubInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startValue, setStartValue] = useState(0);
  const labelRef = useRef<HTMLLabelElement>(null);

  const clampValue = useCallback((val: number): number => {
    let clamped = val;
    if (min !== undefined) clamped = Math.max(min, clamped);
    if (max !== undefined) clamped = Math.min(max, clamped);
    return clamped;
  }, [min, max]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click

    e.preventDefault();
    setIsDragging(true);
    setStartX(e.clientX);
    setStartValue(value === '' ? 0 : Number(value));

    // Change cursor globally while dragging
    document.body.style.cursor = 'ew-resize';
  }, [value]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const delta = e.clientX - startX;
    // Sensitivity: pixels per step unit
    const sensitivity = e.shiftKey ? 0.1 : 1; // Shift for fine control
    const stepMultiplier = e.ctrlKey ? 10 : 1; // Ctrl for faster change

    const newValue = startValue + Math.round(delta / 2) * step * stepMultiplier * sensitivity;
    const clamped = clampValue(newValue);

    onChange(clamped.toString());
  }, [isDragging, startX, startValue, step, clampValue, onChange]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      document.body.style.cursor = '';
    }
  }, [isDragging]);

  // Global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const currentValue = value === '' ? 0 : Number(value);
    const delta = e.deltaY > 0 ? -step : step;
    const multiplier = e.shiftKey ? 0.1 : e.ctrlKey ? 10 : 1;
    const newValue = clampValue(currentValue + delta * multiplier);
    onChange(newValue.toString());
  }, [value, step, clampValue, onChange]);

  const inputClasses = `w-full px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white focus:outline-none focus:border-blue-500 ${className}`;

  return (
    <div>
      {label && (
        <label
          ref={labelRef}
          onMouseDown={handleMouseDown}
          className={`block text-sm text-gray-400 mb-1 select-none ${
            isDragging ? 'cursor-ew-resize' : 'cursor-ew-resize hover:text-gray-200'
          }`}
          title="Drag horizontally to change value. Shift: fine, Ctrl: fast"
        >
          {label}
          <span className="ml-1 text-xs text-gray-600">↔</span>
        </label>
      )}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onWheel={handleWheel}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={inputClasses}
      />
    </div>
  );
}

/**
 * Simple numeric input without label scrubbing, but with wheel support.
 */
export function NumericInput({
  value,
  onChange,
  placeholder = '',
  min,
  max,
  step = 1,
  className = '',
}: Omit<ScrubInputProps, 'label'>) {
  const clampValue = useCallback((val: number): number => {
    let clamped = val;
    if (min !== undefined) clamped = Math.max(min, clamped);
    if (max !== undefined) clamped = Math.min(max, clamped);
    return clamped;
  }, [min, max]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const currentValue = value === '' ? 0 : Number(value);
    const delta = e.deltaY > 0 ? -step : step;
    const multiplier = e.shiftKey ? 0.1 : e.ctrlKey ? 10 : 1;
    const newValue = clampValue(currentValue + delta * multiplier);
    onChange(newValue.toString());
  }, [value, step, clampValue, onChange]);

  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onWheel={handleWheel}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      className={`px-3 py-2 bg-[#1e1e2e] border border-[#444] rounded text-white focus:outline-none focus:border-blue-500 ${className}`}
    />
  );
}