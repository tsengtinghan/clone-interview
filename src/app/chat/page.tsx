"use client";

import { useState, useRef } from "react";
import {
  chatWithCloneAction,
  generateIntroductionAction,
  transcribeAudioAction,
} from "./actions";
import { ChatInterface } from "@/components/chat-interface";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ChatMessage } from "@/lib/type";

export const runtime = 'edge'

export default function ChatPage() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLLMProcessing, setIsLLMProcessing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startChat = async () => {
    const savedSummary = localStorage.getItem("conversation_summary");
    if (!savedSummary) {
      return;
    }

    const parsedSummary = JSON.parse(savedSummary);
    setSummary(parsedSummary);
    setStarted(true);
    setIsLLMProcessing(true);

    try {
      const introMessage = await generateIntroductionAction(parsedSummary);
      setMessages([introMessage]);

      if (introMessage.audioData) {
        await playAudioStream(introMessage.audioData);
      }
    } finally {
      setIsLLMProcessing(false);
    }
  };

  const playAudioStream = async (audioBase64: string) => {
    setIsPlaying(true);

    try {
      const audioData = Uint8Array.from(atob(audioBase64), (c) =>
        c.charCodeAt(0)
      );
      const audioBlob = new Blob([audioData], { type: "audio/mp3" });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audioElement = new Audio(audioUrl);
      audioElement.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audioElement.play();
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlaying(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/mp3",
        });

        try {
          setIsProcessing(true);
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result?.toString().split(",")[1];
            if (base64Audio) {
              const transcription = await transcribeAudioAction(base64Audio);
              setUserInput(transcription);
            }
            setIsProcessing(false);
          };
        } catch (error) {
          console.error("Error processing audio:", error);
          setIsProcessing(false);
        } finally {
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const clearHistory = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("conversation_summary");
      localStorage.removeItem("raw_conversation");
      window.location.reload(); // Reload page after clearing
    }
  };

  if (
    typeof window !== "undefined" &&
    !localStorage.getItem("conversation_summary")
  ) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p>No conversation data found. Please complete an interview first.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="w-full flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">
              Chat with Clone
            </h1>
            <button
              onClick={clearHistory}
              className="text-red-500 hover:text-red-600 text-sm"
            >
              Clear History
            </button>
          </div>

          {!started ? (
            <Button
              onClick={startChat}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-lg"
              disabled={isLLMProcessing}
            >
              {isLLMProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Start Chat
            </Button>
          ) : (
            <ChatInterface
              messages={messages}
              isPlaying={isPlaying}
              isRecording={isRecording}
              isProcessing={isProcessing}
              isLLMProcessing={isLLMProcessing}
              userInput={userInput}
              onUserInputChange={setUserInput}
              onSendMessage={async (message) => {
                const updatedMessages = [
                  ...messages,
                  {
                    role: "user",
                    content: [{ type: "text", text: message }],
                  },
                ];
                setMessages(updatedMessages);
                setUserInput("");

                setIsLLMProcessing(true);
                try {
                  const aiResponse = await chatWithCloneAction(
                    updatedMessages,
                    summary
                  );
                  setMessages([...updatedMessages, aiResponse]);
                  if (aiResponse.audioData) {
                    await playAudioStream(aiResponse.audioData);
                  }
                } finally {
                  setIsLLMProcessing(false);
                }
              }}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
            />
          )}
        </div>
      </div>
    </div>
  );
}
