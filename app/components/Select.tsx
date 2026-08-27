'use client'

import { useEffect, useId, useRef, useState } from 'react'

/**
 * Styled select.
 *
 * A native `<select>` renders its option list as an OS popup: the highlight is
 * the system accent colour and no CSS reaches it, so on Windows a dark app gets
 * a bright blue band it cannot theme. This is a listbox instead — the same
 * keyboard contract, entirely our own paint.
 *
 * Keyboard: Enter/Space/Down/Up to open, Up/Down to move, Home/End to jump,
 * Enter to choose, Escape to cancel, Tab or an outside click to dismiss.
 */

export type SelectOption = {
  value: string
  label: string
  /** Second line, for the detail that does not belong in the label. */
  hint?: string
}

export function Select({
  value,
  options,
  onChange,
  label,
  id,
  placeholder = 'Select…',
  compact = false,
  className = '',
}: {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  /** Accessible name. Rendered by the caller if it wants a visible label. */
  label: string
  id?: string
  placeholder?: string
  compact?: boolean
  className?: string
}) {
  const generatedId = useId()
  const buttonId = id ?? generatedId
  const listId = `${buttonId}-listbox`

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapper = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

  // Open on the current choice rather than at the top.
  function openList() {
    setActive(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  function commit(index: number) {
    const option = options[index]
    if (option) onChange(option.value)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false)
    }
    // Any scroll of an ancestor would detach the list from the button.
    const onScroll = (e: Event) => {
      if (!listRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  // Keep the active option in view when moving by keyboard.
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({
      block: 'nearest',
    })
  }, [open, active])

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        openList()
      }
      return
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
      case 'Tab':
        setOpen(false)
        break
      case 'ArrowDown':
        e.preventDefault()
        setActive((i) => Math.min(options.length - 1, i + 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActive((i) => Math.max(0, i - 1))
        break
      case 'Home':
        e.preventDefault()
        setActive(0)
        break
      case 'End':
        e.preventDefault()
        setActive(options.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        commit(active)
        break
    }
  }

  return (
    <div ref={wrapper} className={`relative ${className}`}>
      <button
        type="button"
        id={buttonId}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border bg-[var(--color-surface)] px-4 text-left ${
          compact ? 'compact text-sm' : 'text-base'
        } ${open ? 'border-[var(--color-accent)]' : 'border-[var(--color-line)]'}`}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? (
            selected.label
          ) : (
            <span className="text-[var(--color-faint)]">{placeholder}</span>
          )}
        </span>
        <span
          aria-hidden="true"
          className={`shrink-0 text-[var(--color-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          className="absolute z-40 mt-1 max-h-72 w-full overflow-y-auto overscroll-contain rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-raised)] p-1 shadow-2xl"
        >
          {options.map((option, i) => {
            const isSelected = option.value === value
            const isActive = i === active
            return (
              <li key={option.value}>
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard is handled on the combobox, per the listbox pattern. */}
                <div
                  role="option"
                  aria-selected={isSelected}
                  data-active={isActive}
                  onClick={() => commit(i)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ${
                    compact ? 'compact' : ''
                  } ${isActive ? 'bg-[var(--color-accent-soft)]' : ''}`}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate ${isSelected ? 'font-semibold text-[var(--color-accent)]' : ''}`}
                    >
                      {option.label}
                    </span>
                    {option.hint && (
                      <span className="block truncate text-xs text-[var(--color-faint)]">
                        {option.hint}
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <span aria-hidden="true" className="shrink-0 text-[var(--color-accent)]">
                      ✓
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
