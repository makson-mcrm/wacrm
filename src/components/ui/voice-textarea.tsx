'use client';

import { useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type SpeechResultEvent = { results: { [index: number]: { [index: number]: { transcript: string }; isFinal: boolean }; length: number } };
type SpeechRecognitionLike = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
  start: () => void; stop: () => void;
};

export function VoiceTextarea({ value, onChange, placeholder, className }: { value: string; onChange: (value: string) => void; placeholder?: string; className?: string }) {
  const [recording, setRecording] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  function toggleRecording() {
    if (recording) { recognition.current?.stop(); return; }
    const BrowserRecognition = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!BrowserRecognition) { toast.error('Ta przeglądarka nie obsługuje dyktowania. Użyj Chrome.'); return; }
    const instance = new BrowserRecognition();
    instance.lang = 'pl-PL'; instance.continuous = true; instance.interimResults = false;
    instance.onresult = (event) => {
      let spoken = '';
      for (let i = 0; i < event.results.length; i += 1) if (event.results[i].isFinal) spoken += `${event.results[i][0].transcript} `;
      if (spoken.trim()) onChange(`${value}${value.trim() ? '\n' : ''}${spoken.trim()}`);
    };
    instance.onend = () => setRecording(false);
    instance.onerror = () => { setRecording(false); toast.error('Dyktowanie zostało przerwane. Spróbuj ponownie.'); };
    recognition.current = instance; instance.start(); setRecording(true);
  }

  return <div className="space-y-2"><Textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={className} /><Button type="button" size="sm" variant={recording ? 'destructive' : 'outline'} onClick={toggleRecording}>{recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}{recording ? 'Zatrzymaj dyktowanie' : 'Dyktuj po polsku'}</Button></div>;
}
