/**
 * Device capability seam — PRD 18.4 constraint 3.
 *
 * Every capability reports availability so each surface can render an
 * unavailable state BEFORE the Capacitor shell exists. That is what stops
 * "Bluetooth is broken" from being a user's first impression on iOS.
 *
 * Adding a platform means adding an implementation here. It must never mean
 * touching a feature screen.
 */

export type Availability =
  | { available: true }
  | { available: false; reason: string; remedy?: string }

export interface WakeLockCapability {
  check(): Availability
  request(): Promise<() => void>
}

/** A mass reading from a connected scale. PRD F10 R1. */
export type ScaleReading = { grams: number; at: number; flowGPerS?: number }

/**
 * Transport is separate from protocol on purpose (PRD F10 R1).
 * Web Bluetooth now; native BLE in the shell. Same interface either way.
 */
export interface ScaleTransport {
  readonly name: string
  check(): Availability
  connect(): Promise<ScaleConnection>
}

export interface ScaleConnection {
  readonly deviceName: string
  subscribe(fn: (r: ScaleReading) => void): () => void
  tare(): Promise<void>
  disconnect(): Promise<void>
}

export interface HapticsCapability {
  check(): Availability
  tick(): void
  stepBoundary(): void
}

export type Capabilities = {
  wakeLock: WakeLockCapability
  haptics: HapticsCapability
  scale: ScaleTransport
}

export const UNAVAILABLE_ON_IOS_BROWSER: Availability = {
  available: false,
  reason:
    'Web Bluetooth is not available in Safari or any iOS browser, so a scale cannot connect here.',
  remedy: 'Use manual mode, or the installable app once it ships.',
}
