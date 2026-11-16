import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { useTranslation, type StringKey } from '@/i18n';
import { MAX_TV_NAME_LENGTH, useSavedTvs } from '@/services/saved-tvs-context';

const errorKeys = {
  empty: 'addTv.error.empty',
  invalidFormat: 'addTv.error.invalidFormat',
  notPrivate: 'addTv.error.notPrivate',
  duplicate: 'addTv.error.duplicate',
} as const satisfies Record<string, StringKey>;

type AddTvFormProps = {
  onDone: () => void;
  /** IP found by discovery: shown read-only, only the name is asked. */
  fixedIp?: string;
};

/** Saves a TV by name + private IP. Saving makes no network request. */
export function AddTvForm({ onDone, fixedIp }: AddTvFormProps) {
  const { t } = useTranslation();
  const { addTv } = useSavedTvs();
  const [name, setName] = useState('');
  const [ip, setIp] = useState(fixedIp ?? '');
  const [error, setError] = useState<keyof typeof errorKeys | null>(null);

  const submit = () => {
    const result = addTv(name, ip);
    if (result.ok) {
      onDone();
    } else {
      setError(result.error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary" nativeID="tvNameLabel">
          {t('addTv.name.label')}
        </ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('addTv.name.placeholder')}
          placeholderTextColor={Colors.textSecondary}
          maxLength={MAX_TV_NAME_LENGTH}
          autoCapitalize="words"
          autoFocus={fixedIp !== undefined}
          returnKeyType={fixedIp !== undefined ? 'done' : 'next'}
          onSubmitEditing={fixedIp !== undefined ? submit : undefined}
          accessibilityLabelledBy="tvNameLabel"
          accessibilityLabel={t('addTv.name.label')}
          style={styles.input}
        />
      </View>

      {fixedIp !== undefined ? (
        <View style={styles.field} accessible>
          <ThemedText type="small" themeColor="textSecondary">
            {t('addTv.ip.label')}
          </ThemedText>
          <ThemedText type="small">{fixedIp}</ThemedText>
          {error ? (
            <ThemedText type="small" style={styles.errorText} accessibilityRole="alert">
              {t(errorKeys[error])}
            </ThemedText>
          ) : null}
        </View>
      ) : (
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary" nativeID="tvIpLabel">
            {t('addTv.ip.label')}
          </ThemedText>
          <TextInput
            value={ip}
            onChangeText={(text) => {
              setIp(text);
              if (error) setError(null);
            }}
            placeholder="192.168.1.50"
            placeholderTextColor={Colors.textSecondary}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'}
            autoCorrect={false}
            autoCapitalize="none"
            maxLength={15}
            returnKeyType="done"
            onSubmitEditing={submit}
            accessibilityLabelledBy="tvIpLabel"
            accessibilityLabel={t('addTv.ip.label')}
            style={[styles.input, error && styles.inputError]}
          />
          {error ? (
            <ThemedText
              type="small"
              style={styles.errorText}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite">
              {t(errorKeys[error])}
            </ThemedText>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {t('addTv.ip.hint')}
            </ThemedText>
          )}
        </View>
      )}

      {fixedIp === undefined ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('addTv.noCheckNote')}
        </ThemedText>
      ) : null}

      <View style={styles.actions}>
        <Button label={t('common.cancel')} variant="secondary" onPress={onDone} />
        <Button label={t('common.save')} onPress={submit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    minHeight: MinTouchTarget,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    color: Colors.text,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    color: Colors.danger,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});