import * as Haptics from 'expo-haptics';

/** Light tap on key press, like a physical remote. Never throws (some devices have no vibrator). */
export function keyFeedback() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Subtler tick for auto-repeat while a key is held. */
export function repeatFeedback() {
  Haptics.selectionAsync().catch(() => {});
}