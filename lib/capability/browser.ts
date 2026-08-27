/**
 * Browser implementations of the capability seam.
 *
 * Every one of these fails loudly and informatively rather than silently
 * (PRD F10 R4). Nothing here throws on an unsupported platform — the caller
 * gets `available: false` with a reason it can put on screen.
 */

import {
  type Availability,
  type Capabilities,
  type HapticsCapability,
  type ScaleConnection,
  type ScaleTransport,
  UNAVAILABLE_ON_IOS_BROWSER,
  type WakeLockCapability,
} from './index'

const NO_DOCUMENT: Availability = {
  available: false,
  reason: 'Not running in a browser.',
}

const wakeLock: WakeLockCapability = {
  check(): Availability {
    if (typeof navigator === 'undefined') return NO_DOCUMENT
    if (!('wakeLock' in navigator)) {
      return {
        available: false,
        reason: 'This browser cannot keep the screen awake.',
        remedy: 'Set your screen timeout longer while brewing.',
      }
    }
    return { available: true }
  },

  async request(): Promise<() => void> {
    const status = this.check()
    if (!status.available) throw new Error(status.reason)
    // `wakeLock` is not in every TS DOM lib yet.
    const sentinel = await (
      navigator as Navigator & {
        wakeLock: { request(type: 'screen'): Promise<{ release(): Promise<void> }> }
      }
    ).wakeLock.request('screen')
    let released = false
    return () => {
      if (released) return
      released = true
      void sentinel.release()
    }
  },
}

const haptics: HapticsCapability = {
  check(): Availability {
    if (typeof navigator === 'undefined') return NO_DOCUMENT
    if (!('vibrate' in navigator)) {
      return {
        available: false,
        reason: 'This browser has no vibration API (all iOS browsers included).',
        remedy: 'Audio and visual cues carry every step boundary.',
      }
    }
    return { available: true }
  },
  tick() {
    if (this.check().available) navigator.vibrate(10)
  },
  stepBoundary() {
    if (this.check().available) navigator.vibrate([40, 60, 40])
  },
}

/**
 * Web Bluetooth transport. Absent from Safari on every platform, and every iOS
 * browser is WebKit, so this is unavailable on iPhone by construction (PRD 18.2).
 * The Capacitor shell registers a native BLE transport against this same
 * interface at Phase 2, and no calling code changes.
 */
const webBluetoothScale: ScaleTransport = {
  name: 'Web Bluetooth',

  check(): Availability {
    if (typeof navigator === 'undefined') return NO_DOCUMENT
    if (!('bluetooth' in navigator)) {
      const ua = navigator.userAgent
      const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document)
      if (isIOS) return UNAVAILABLE_ON_IOS_BROWSER
      return {
        available: false,
        reason: 'This browser does not support Web Bluetooth.',
        remedy:
          'Chrome or Edge on desktop and Android can connect a scale. Manual mode works everywhere.',
      }
    }
    return { available: true }
  },

  async connect(): Promise<ScaleConnection> {
    const status = this.check()
    if (!status.available) throw new Error(status.reason)
    // ponytail: per-model protocol adapters land with F10 at Phase 2. The seam
    // is what matters now — this deliberately refuses rather than half-works.
    throw new Error('No scale protocol adapter is registered yet (PRD F10, Phase 2).')
  },
}

export const browserCapabilities: Capabilities = {
  wakeLock,
  haptics,
  scale: webBluetoothScale,
}
