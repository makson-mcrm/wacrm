'use client';

import { useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type SpeechResultEvent = {
  resultIndex?: number;
  results: {
    [index: number]: {
      [index: number]: { transcript: string };
      isFinal: boolean;
    };
    length: number;
  };
};
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function VoiceTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  function toggleRecording() {
    if (recording) {
      recognition.current?.stop();
      if (mediaRecorder.current?.state === 'recording')
        mediaRecorder.current.stop();
      return;
    }
    const BrowserRecognition =
      (
        window as unknown as {
          SpeechRecognition?: new () => SpeechRecognitionLike;
          webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        }
      ).SpeechRecognition ??
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        }
      ).webkitSpeechRecognition;
    if (!BrowserRecognition) {
      void startAudioRecording();
      return;
    }
    const instance = new BrowserRecognition();
    instance.lang = 'pl-PL';
    instance.continuous = true;
    instance.interimResults = false;
    instance.onresult = (event) => {
      let spoken = '';
      for (let i = event.resultIndex ?? 0; i < event.results.length; i += 1)
        if (event.results[i].isFinal)
          spoken += `${event.results[i][0].transcript} `;
      if (spoken.trim())
        onChange(`${value}${value.trim() ? '\n' : ''}${spoken.trim()}`);
    };
    instance.onend = () => setRecording(false);
    instance.onerror = () => {
      setRecording(false);
      toast.error('Dyktowanie zostało przerwane. Spróbuj ponownie.');
    };
    recognition.current = instance;
    instance.start();
    setRecording(true);
  }

  async function startAudioRecording() {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      toast.error('Ta przeglądarka nie pozwala nagrać notatki głosowej.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      audioChunks.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunks.current.push(event.data);
      };
      recorder.onstop = async () => {
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunks.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (!blob.size) return;
        setTranscribing(true);
        try {
          const data = new FormData();
          const extension = recorder.mimeType.includes('mp4') ? 'm4a' : 'webm';
          data.append('audio', blob, `notatka.${extension}`);
          const response = await fetch('/api/ai/transcribe', {
            method: 'POST',
            body: data,
          });
          const result = (await response.json().catch(() => ({}))) as {
            text?: string;
            error?: string;
          };
          if (!response.ok || !result.text)
            throw new Error(
              result.error || 'Nie udało się przepisać nagrania.'
            );
          onChange(`${value}${value.trim() ? '\n' : ''}${result.text}`);
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : 'Nie udało się przepisać nagrania.'
          );
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      setRecording(true);
    } catch {
      toast.error('Nie udało się uzyskać dostępu do mikrofonu.');
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={className}
      />
      <Button
        type="button"
        size="sm"
        variant={recording ? 'destructive' : 'outline'}
        onClick={toggleRecording}
        disabled={transcribing}
      >
        {recording ? (
          <Square className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        {transcribing
          ? 'Przepisuję nagranie…'
          : recording
            ? 'Zatrzymaj dyktowanie'
            : 'Dyktuj po polsku'}
      </Button>
    </div>
  );
}
