import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
    type ExpoSpeechRecognitionErrorCode,
} from 'expo-speech-recognition';
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { Language, StringKey } from '@/i18n';

export type VoiceStatus = 'idle' | 'listening';

/**
 * Listens for one spoken command and returns the final text through `onFinal`.
 *
 * Privacy: recognition is **on-device only** (`requiresOnDeviceRecognition`). Android does that
 * reliably from Android 13 (API 33, `createOnDeviceSpeechRecognizer`); older versions could fall
 * back to an online service, so voice commands are refused there instead.
 */
export function useVoiceRecognition({
  language,
  contextualStrings,
  onFinal,
}: {
  language: Language;
  /** Words to bias recognition towards, e.g. app names. */
  contextualStrings: string[];
  onFinal: (text: string) => void;
}) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<StringKey | null>(null);
  // Last partial text, used if the recognizer ends without a final result.
  const latest = useRef('');
  const delivered = useRef(false);

  const deliver = useCallback(
    (text: string) => {
      if (delivered.current || !text.trim()) return;
      delivered.current = true;
      onFinal(text.trim());
    },
    [onFinal],
  );

  useSpeechRecognitionEvent('start', () => setStatus('listening'));
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    latest.current = text;
    setTranscript(text);
    if (event.isFinal) deliver(text);
  });
  useSpeechRecognitionEvent('error', (event) => {
    setError(errorKey(event.error));
    setStatus('idle');
  });
  useSpeechRecognitionEvent('end', () => {
    deliver(latest.current);
    setStatus('idle');
  });

  const start = useCallback(async () => {
    setError(null);
    setTranscript('');
    latest.current = '';
    delivered.current = false;

    const blocked = unsupportedReason();
    if (blocked) return setError(blocked);

    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync().catch(() => null);
    if (!permission?.granted) return setError('voice.error.permission');

    try {
      ExpoSpeechRecognitionModule.start({
        lang: language === 'tr' ? 'tr-TR' : 'en-US',
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
        requiresOnDeviceRecognition: true,
        contextualStrings,
      });
    } catch {
      setError('voice.error.unavailable');
    }
  }, [language, contextualStrings]);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { status, transcript, error, start, stop };
}

/** Why voice commands cannot run on this device, or null if they can. */
function unsupportedReason(): StringKey | null {
  if (Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version < 33) {
    return 'voice.error.androidVersion';
  }
  try {
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) return 'voice.error.unavailable';
    if (Platform.OS === 'ios' && !ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) {
      return 'voice.error.offlineModel';
    }
  } catch {
    return 'voice.error.unavailable';
  }
  return null;
}

function errorKey(code: ExpoSpeechRecognitionErrorCode): StringKey | null {
  switch (code) {
    case 'aborted':
      return null;
    case 'not-allowed':
      return 'voice.error.permission';
    case 'no-speech':
    case 'speech-timeout':
      return 'voice.error.noSpeech';
    // With on-device recognition these mean the offline model for the language is missing.
    case 'language-not-supported':
    case 'network':
      return 'voice.error.offlineModel';
    default:
      return 'voice.error.unavailable';
  }
}