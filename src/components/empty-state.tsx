import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';

type EmptyStateProps = {
  title: string;
  message: string;
};

/** Bir ekranın neden boş olduğunu ya da bir özelliğin neden kullanılamadığını (içerik yok, desteklenmiyor, TV bağlı değil) başlık ve açıklamayla anlatır. */
export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <ThemedView
      type="backgroundElement"
      style={styles.container}
      accessible
      accessibilityLabel={`${title}. ${message}`}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {message}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
  },
});