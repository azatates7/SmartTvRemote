import * as Haptics from 'expo-haptics';

/** Light tap on key press, like a physical remote. Never throws (some devices have no vibrator). */
export function keyFeedback() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Subtler tick for auto-repeat while a key is held. */
export function repeatFeedback() {
  Haptics.selectionAsync().catch(() => {});
}

/** Warning buzz when a key is pressed but nothing can be sent (no TV connected). */
export function warningFeedback() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}