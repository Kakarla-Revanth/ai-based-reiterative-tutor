"use client";

import { useRef, useState } from "react";
import { LoaderCircle, Mic, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function FloatingVoiceButton({
  token,
  language,
  onTranscript
}: {
  token: string;
  language: string;
  onTranscript: (text: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      onTranscript("This browser does not support microphone recording.");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setLoading(true);
      try {
        const result = await api.transcribeAudio(token, language, blob);
        onTranscript(result.transcript);
      } catch (error) {
        onTranscript(error instanceof Error ? error.message : "Voice transcription failed.");
      } finally {
        setLoading(false);
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="shrink-0">
      <Button
        className="h-14 w-14 rounded-full p-0 shadow-glow"
        onClick={recording ? stopRecording : startRecording}
        type="button"
      >
        {loading ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : recording ? (
          <Square className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
