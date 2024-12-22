"use client";

import { useState, useRef, useEffect } from "react";
import { chatWithCloneAction, generateIntroductionAction, transcribeAudioAction } from "./actions";
import { Mic, Square, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Load the conversation summary and start chat
    const initializeChat = async () => {
      const savedSummary = localStorage.getItem("conversation_summary");
      if (savedSummary) {
        const parsedSummary = JSON.parse(savedSummary);
        setSummary(parsedSummary);

        // Generate introduction based on the summary
        const introMessage = await generateIntroductionAction(parsedSummary);
        setMessages([introMessage]);

        if (introMessage.audioData) {
          await playAudioStream(introMessage.audioData);
        }
      }
    };

    initializeChat();
  }, []);

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !summary) return;

    const updatedMessages = [
      ...messages,
      {
        role: "user",
        content: [{ type: "text", text: userInput }],
      },
    ];
    setMessages(updatedMessages);
    setUserInput("");

    const aiResponse = await chatWithCloneAction(updatedMessages, summary);
    setMessages([...updatedMessages, aiResponse]);

    if (aiResponse.audioData) {
      await playAudioStream(aiResponse.audioData);
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
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/mp3",
        });

        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result?.toString().split(",")[1];
            if (base64Audio) {
              const transcription = await transcribeAudioAction(base64Audio);
              setUserInput(transcription);
            }
          };
        } catch (error) {
          console.error("Error processing audio:", error);
        } finally {
          setIsProcessing(false);
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
    }
  };

  if (!summary) {
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
          <h1 className="text-3xl font-bold tracking-tight">Chat with Clone</h1>

          <Card className="w-full bg-zinc-900 border-zinc-800">
            <div className="p-6 space-y-6">
              {/* Conversation Area */}
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      msg.role === "assistant" ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`
                        max-w-[80%] rounded-lg p-4 
                        ${
                          msg.role === "assistant"
                            ? "bg-zinc-800"
                            : "bg-orange-500"
                        }
                      `}
                    >
                      <p className="text-sm text-zinc-400 mb-1">
                        {msg.role === "assistant" ? "Clone" : "You"}
                      </p>
                      <p className="text-white">
                        {msg.content.map((c: any) => c.text).join(" ")}
                        {isPlaying && msg === messages[messages.length - 1] && (
                          <span className="ml-2 animate-pulse">🔊</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <form onSubmit={handleSend} className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Input
                    value={isProcessing ? "Transcribing..." : userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isPlaying || isRecording || isProcessing}
                    className="flex-1 bg-zinc-800 border-zinc-700 text-white"
                  />
                  <Button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isPlaying || isProcessing}
                    variant="outline"
                    className={`
                      p-3 
                      ${
                        isRecording
                          ? "bg-red-500 hover:bg-red-600 border-red-400"
                          : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700"
                      }
                    `}
                  >
                    {isRecording ? (
                      <Square className="h-5 w-5 text-white" />
                    ) : (
                      <Mic className="h-5 w-5 text-white" />
                    )}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPlaying || isRecording}
                    className="bg-orange-500 hover:bg-orange-600 p-3"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </form>

              {/* Recording Indicator */}
              {isRecording && (
                <div className="flex items-center justify-center text-red-500 animate-pulse">
                  <span className="mr-2">●</span> Recording
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
