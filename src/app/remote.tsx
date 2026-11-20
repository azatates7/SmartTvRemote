import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppBadge } from '@/components/app-badge';
import { Icon, type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MaxContentWidth, MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import type { RemoteKey, TvErrorCode } from '@/domain/tv';
import { useTranslation, type StringKey } from '@/i18n';
import { SMART_CENTER_KEY_CODES } from '@/protocols/smart-center/send-key';
import { useConnection, type AppsState, type CommandTarget } from '@/services/connection-context';
import { keyFeedback, repeatFeedback, warningFeedback } from '@/services/feedback';

/**
 * Keys stay visible without a connection, so the layout does not jump.
 * Pressing one then sends nothing and shows a warning instead.
 */
type RemoteGuard = { connected: boolean; warn: () => void };
const RemoteGuardContext = createContext<RemoteGuard>({ connected: true, warn: () => {} });

const WARNING_VISIBLE_MS = 2500;

const keyNames: Partial<Record<RemoteKey, StringKey>> = {
  up: 'key.up',
  down: 'key.down',
  left: 'key.left',
  right: 'key.right',
  ok: 'key.ok',
  back: 'key.back',
  home: 'key.home',
  exit: 'key.exit',
  volumeUp: 'key.volumeUp',
  volumeDown: 'key.volumeDown',
  mute: 'key.mute',
  channelUp: 'key.channelUp',
  channelDown: 'key.channelDown',
  play: 'key.play',
  stop: 'key.stop',
  power: 'key.power',
  menu: 'key.menu',
  source: 'key.source',
  youtube: 'key.youtube',
  portal: 'key.portal',
  previous: 'key.previous',
  next: 'key.next',
};

const errorKeys: Partial<Record<TvErrorCode, StringKey>> = {
  timeout: 'remote.error.timeout',
  unreachable: 'remote.error.unreachable',
  unsupported: 'remote.error.refused',
};

const DIGITS: RemoteKey[][] = [
  ['digit1', 'digit2', 'digit3'],
  ['digit4', 'digit5', 'digit6'],
  ['digit7', 'digit8', 'digit9'],
];

type T = ReturnType<typeof useTranslation>['t'];

function keyLabel(key: RemoteKey, t: T): string {
  if (key.startsWith('digit')) return `${t('key.digit')} ${key.slice(5)}`;
  return t(keyNames[key] ?? 'key.ok');
}

function targetLabel(target: CommandTarget, t: T, apps: AppsState): string {
  if (target.type === 'key') return keyLabel(target.key, t);
  const app = apps.status === 'ready' ? apps.apps.find((a) => a.id === target.appId) : undefined;
  return app?.label ?? target.appId;
}

export default function RemoteScreen() {
  const { t } = useTranslation();
  const { state, lastCommand, sendKey, apps } = useConnection();
  const [numpadOpen, setNumpadOpen] = useState(false);
  const [page, setPage] = useState<'main' | 'more'>('main');
  const connected = state.status === 'connected';

  // Highlighted for a moment when a key is pressed without a connection.
  const [warning, setWarning] = useState(false);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const warn = useCallback(() => {
    warningFeedback();
    setWarning(true);
    clearTimeout(warningTimer.current);
    warningTimer.current = setTimeout(() => setWarning(false), WARNING_VISIBLE_MS);
  }, []);
  useEffect(() => () => clearTimeout(warningTimer.current), []);
  useEffect(() => {
    if (connected) setWarning(false);
  }, [connected]);

  const confirmPower = () => {
    if (!connected) return warn();
    keyFeedback();
    Alert.alert(t('power.confirm.title'), t('power.confirm.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('power.confirm.ok'), style: 'destructive', onPress: () => sendKey('power') },
    ]);
  };

  const statusText =
    state.status === 'connected'
      ? `${t('remote.connectedTo')} ${state.tv.name}`
      : state.status === 'connecting'
        ? t(state.searching ? 'connection.searching' : 'connection.connecting')
        : warning
          ? t('remote.notSent')
          : t('remote.noTv.message');

  return (
    <RemoteGuardContext.Provider value={{ connected, warn }}>
    <Screen title={t('remote.title')}>
      <View style={styles.header}>
        <View style={styles.headerText} accessibilityLiveRegion="polite">
          <View style={[styles.dot, !connected && styles.dotOff]} />
          <ThemedText
            type="small"
            themeColor={warning ? undefined : 'textSecondary'}
            style={[styles.statusText, warning && styles.error]}>
            {statusText}
          </ThemedText>
        </View>
        {SMART_CENTER_KEY_CODES.power !== undefined ? (
          <Pressable
            onPress={confirmPower}
            accessibilityRole="button"
            accessibilityLabel={t('key.power')}
            hitSlop={8}
            style={({ pressed }) => [styles.powerButton, pressed && styles.pressed]}>
            <Icon name="power" size={26} color={Colors.danger} />
          </Pressable>
        ) : null}
      </View>

      <PageSwitch page={page} onChange={setPage} />

      {page === 'more' ? <MorePage /> : null}

      {page === 'main' ? (
        <>
          <DPadPanel />

          {/* Back / 123 / Home / Exit */}
          <View style={styles.utilityRow}>
            <Key k="back" style={styles.utilityKey}>
              <Icon name="back" />
            </Key>
            <Pressable
              onPress={() => {
                keyFeedback();
                setNumpadOpen((open) => !open);
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded: numpadOpen }}
              accessibilityLabel={t('remote.numpad')}
              style={({ pressed }) => [styles.numpadToggle, pressed && styles.pressed]}>
              <ThemedText type="smallBold">123</ThemedText>
            </Pressable>
            <Key k="home" style={styles.utilityKey}>
              <Icon name="home" />
            </Key>
            <Key k="exit" style={styles.utilityKey}>
              <ThemedText type="smallBold">EXIT</ThemedText>
            </Key>
          </View>

          {numpadOpen ? <Numpad onClose={() => setNumpadOpen(false)} /> : null}

          {/* Media */}
          <View style={styles.mediaRow}>
            <Key k="play" style={styles.roundKey}>
              <Icon name="play" />
            </Key>
            <Key k="stop" style={styles.roundKey}>
              <Icon name="stop" />
            </Key>
            <Key k="mute" style={styles.roundKey}>
              <Icon name="mute" />
            </Key>
          </View>

          <AppShortcuts />
        </>
      ) : null}

      {/* Last command: lets the user verify each key during testing */}
      <View accessibilityLiveRegion="polite">
        {connected && lastCommand ? (
          <ThemedText
            type="small"
            style={lastCommand.ok ? undefined : styles.error}
            themeColor={lastCommand.ok ? 'textSecondary' : undefined}>
            {`${t('remote.lastCommand')} ${targetLabel(lastCommand.target, t, apps)} · `}
            {lastCommand.ok
              ? `HTTP ${lastCommand.httpStatus} · ${lastCommand.elapsedMs} ms`
              : `${t(errorKeys[lastCommand.code] ?? 'check.error.unknown')}${
                  lastCommand.httpStatus ? ` (HTTP ${lastCommand.httpStatus})` : ''
                }`}
          </ThemedText>
        ) : null}
      </View>

    </Screen>
    </RemoteGuardContext.Provider>
  );
}

/** Square panel: V+/P+/V−/P− in the corners, a ring D-pad with OK in the middle. */
function DPadPanel() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const panel = Math.min(width - Spacing.three * 2, MaxContentWidth, 420);
  const height = Math.round(panel * 0.86);
  const ring = Math.round(panel * 0.6);
  const ok = Math.round(ring * 0.38);

  return (
    <View style={[styles.panel, { width: panel, height }]}>
      <Key k="volumeUp" repeat style={[styles.corner, styles.topLeft]} label={t('key.volumeUp')}>
        <ThemedText type="subtitle" style={styles.cornerText}>V+</ThemedText>
      </Key>
      <Key k="channelUp" repeat style={[styles.corner, styles.topRight]} label={t('key.channelUp')}>
        <ThemedText type="subtitle" style={styles.cornerText}>P+</ThemedText>
      </Key>
      <Key k="volumeDown" repeat style={[styles.corner, styles.bottomLeft]} label={t('key.volumeDown')}>
        <ThemedText type="subtitle" style={styles.cornerText}>V−</ThemedText>
      </Key>
      <Key k="channelDown" repeat style={[styles.corner, styles.bottomRight]} label={t('key.channelDown')}>
        <ThemedText type="subtitle" style={styles.cornerText}>P−</ThemedText>
      </Key>

      <View
        style={[
          styles.ring,
          { width: ring, height: ring, borderRadius: ring / 2, left: (panel - ring) / 2, top: (height - ring) / 2 },
        ]}>
        <Key k="up" style={[styles.arrow, styles.arrowUp]}>
          <Icon name="up" size={30} />
        </Key>
        <Key k="down" style={[styles.arrow, styles.arrowDown]}>
          <Icon name="down" size={30} />
        </Key>
        <Key k="left" style={[styles.arrow, styles.arrowLeft]}>
          <Icon name="left" size={30} />
        </Key>
        <Key k="right" style={[styles.arrow, styles.arrowRight]}>
          <Icon name="right" size={30} />
        </Key>
        <Key
          k="ok"
          style={[
            styles.ok,
            { width: ok, height: ok, borderRadius: ok / 2, left: (ring - ok) / 2 - 3, top: (ring - ok) / 2 - 3 },
          ]}>
          <ThemedText type="subtitle" style={styles.okText}>OK</ThemedText>
        </Key>
      </View>
    </View>
  );
}

function Numpad({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <ThemedView type="backgroundElement" style={styles.numpad}>
      {DIGITS.map((row) => (
        <View key={row.join()} style={styles.numpadRow}>
          {row.map((k) => (
            <Key key={k} k={k} style={styles.digitKey}>
              <ThemedText type="smallBold">{k.slice(5)}</ThemedText>
            </Key>
          ))}
        </View>
      ))}
      <View style={styles.numpadRow}>
        <View style={styles.digitSpacer} />
        <Key k="digit0" style={styles.digitKey}>
          <ThemedText type="smallBold">0</ThemedText>
        </Key>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('remote.numpad.close')}
          style={({ pressed }) => [styles.digitKey, styles.digitClose, pressed && styles.pressed]}>
          <Icon name="close" color={Colors.textSecondary} />
        </Pressable>
      </View>
    </ThemedView>
  );
}

/** Launch buttons for DIAL apps the TV reported as installed. Text labels only (no brand logos). */
function AppShortcuts() {
  const { apps, launchApp } = useConnection();
  if (apps.status !== 'ready') return null;
  const installed = apps.apps.filter((app) => app.installed);
  if (installed.length === 0) return null;

  return (
    <View style={styles.appsRow}>
      {installed.map((app) => (
        <Pressable
          key={app.id}
          onPress={() => {
            keyFeedback();
            launchApp(app.id);
          }}
          accessibilityRole="button"
          accessibilityLabel={app.label}
          style={({ pressed }) => [styles.appPill, pressed && styles.pressed]}>
          <AppBadge appId={app.id} label={app.label} size={30} />
          <ThemedText type="smallBold">{app.label}</ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

/** A remote key. Hidden when the protocol has no code for it (capability-aware UI). */
const REPEAT_DELAY_MS = 450;
const REPEAT_INTERVAL_MS = 160;

/**
 * A remote key with haptic feedback. Hidden when the protocol has no code for it (capability-aware UI).
 * `repeat`: sends on touch-down and keeps sending while held (volume / channel), skipping presses
 * while the TV still has requests queued so they never pile up.
 */
function Key({
  k,
  style,
  label,
  repeat,
  children,
}: {
  k: RemoteKey;
  style?: StyleProp<ViewStyle>;
  /** Spoken label; defaults to the key name. */
  label?: string;
  repeat?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { sendKey } = useConnection();
  const { connected, warn } = useContext(RemoteGuardContext);
  const timers = useRef<{ delay?: ReturnType<typeof setTimeout>; tick?: ReturnType<typeof setInterval> }>({});

  const stopRepeat = () => {
    clearTimeout(timers.current.delay);
    clearInterval(timers.current.tick);
    timers.current = {};
  };
  useEffect(() => stopRepeat, []);

  if (SMART_CENTER_KEY_CODES[k] === undefined) return null;

  const press = () => {
    keyFeedback();
    sendKey(k);
  };

  const handlers = !connected
    ? { onPress: warn }
    : repeat
    ? {
        onPressIn: () => {
          press();
          stopRepeat();
          timers.current.delay = setTimeout(() => {
            timers.current.tick = setInterval(() => {
              repeatFeedback();
              sendKey(k, { skipIfBusy: true });
            }, REPEAT_INTERVAL_MS);
          }, REPEAT_DELAY_MS);
        },
        onPressOut: stopRepeat,
      }
    : { onPress: press };

  return (
    <Pressable
      {...handlers}
      accessibilityRole="button"
      accessibilityLabel={label ?? keyLabel(k, t)}
      style={({ pressed }) => [styles.keyBase, style, !connected && styles.disabled, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

function PageSwitch({ page, onChange }: { page: 'main' | 'more'; onChange: (p: 'main' | 'more') => void }) {
  const { t } = useTranslation();
  const option = (value: 'main' | 'more', label: string) => (
    <Pressable
      onPress={() => {
        keyFeedback();
        onChange(value);
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: page === value }}
      style={[styles.pageOption, page === value && styles.pageOptionSelected]}>
      <ThemedText type="smallBold" style={page === value ? styles.pageTextSelected : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
  return (
    <View style={styles.pageSwitch} accessibilityRole="tablist">
      {option('main', t('remote.page.main'))}
      {option('more', t('remote.page.more'))}
    </View>
  );
}

const MORE_KEYS: { k: RemoteKey; icon: IconName }[] = [
  { k: 'menu', icon: 'menu' },
  { k: 'source', icon: 'source' },
  { k: 'youtube', icon: 'youtube' },
  { k: 'portal', icon: 'portal' },
  { k: 'previous', icon: 'previous' },
  { k: 'next', icon: 'next' },
];

/** Second page: MENU, input source, YouTube, Smart portal, previous / next. */
function MorePage() {
  const { t } = useTranslation();
  return (
    <View style={styles.moreGrid}>
      {MORE_KEYS.map(({ k, icon }) => (
        <View key={k} style={styles.moreItem}>
          <Key k={k} style={styles.roundKey}>
            <Icon name={icon} />
          </Key>
          <ThemedText type="small" themeColor="textSecondary" style={styles.moreCaption}>
            {keyLabel(k, t)}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}


const CORNER = 76;
const ARROW = 60;
const ROUND = 64;

const styles = StyleSheet.create({
  pageSwitch: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.one,
    borderRadius: Radius.card,
    backgroundColor: Colors.backgroundElement,
  },
  pageOption: {
    flex: 1,
    minHeight: MinTouchTarget - 8,
    borderRadius: Radius.card - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageOptionSelected: {
    backgroundColor: Colors.accent,
  },
  pageTextSelected: {
    color: Colors.background,
  },
  moreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    rowGap: Spacing.four,
    paddingVertical: Spacing.three,
  },
  moreItem: {
    width: '33%',
    alignItems: 'center',
    gap: Spacing.two,
  },
  moreCaption: {
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -Spacing.two,
  },
  headerText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
  },
  dotOff: {
    backgroundColor: Colors.textSecondary,
  },
  statusText: {
    flexShrink: 1,
  },
  disabled: {
    opacity: 0.45,
  },
  powerButton: {
    width: MinTouchTarget,
    height: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyBase: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.55,
  },
  panel: {
    alignSelf: 'center',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
  },
  cornerText: {
    fontSize: 24,
    lineHeight: 30,
  },
  topLeft: { top: Spacing.two, left: Spacing.two },
  topRight: { top: Spacing.two, right: Spacing.two },
  bottomLeft: { bottom: Spacing.two, left: Spacing.two },
  bottomRight: { bottom: Spacing.two, right: Spacing.two },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: Colors.accent,
    // Soft glow on iOS; Android shows the solid ring.
    shadowColor: Colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  arrow: {
    position: 'absolute',
    width: ARROW,
    height: ARROW,
  },
  arrowUp: { top: 2, left: '50%', marginLeft: -ARROW / 2 },
  arrowDown: { bottom: 2, left: '50%', marginLeft: -ARROW / 2 },
  arrowLeft: { left: 2, top: '50%', marginTop: -ARROW / 2 },
  arrowRight: { right: 2, top: '50%', marginTop: -ARROW / 2 },
  ok: {
    position: 'absolute',
    backgroundColor: Colors.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  okText: {
    fontSize: 26,
    lineHeight: 32,
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  utilityKey: {
    minWidth: ROUND,
    minHeight: ROUND,
  },
  numpadToggle: {
    width: ROUND + 8,
    height: ROUND + 8,
    borderRadius: (ROUND + 8) / 2,
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpad: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  digitKey: {
    width: ROUND,
    height: ROUND,
    borderRadius: ROUND / 2,
    backgroundColor: Colors.backgroundSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitClose: {
    backgroundColor: 'transparent',
  },
  digitSpacer: {
    width: ROUND,
  },
  mediaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  roundKey: {
    width: ROUND + 8,
    height: ROUND + 8,
    borderRadius: (ROUND + 8) / 2,
    backgroundColor: Colors.backgroundSelected,
  },
  appsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  appPill: {
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: MinTouchTarget,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.four,
    borderRadius: MinTouchTarget / 2,
    backgroundColor: Colors.backgroundSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: Colors.danger,
  },
});