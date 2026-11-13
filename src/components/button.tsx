import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/constants/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  /** Overrides the spoken label, e.g. "Remove Living room TV". */
  accessibilityLabel?: string;
};

export function Button({ label, onPress, variant = 'primary', accessibilityLabel }: ButtonProps) {
  const textColor =
    variant === 'primary' ? Colors.background : variant === 'danger' ? Colors.danger : Colors.text;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={{ color: textColor }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MinTouchTarget,
    minWidth: MinTouchTarget,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: Colors.accent,
  },
  secondary: {
    backgroundColor: Colors.backgroundSelected,
  },
  pressed: {
    opacity: 0.7,
  },
});