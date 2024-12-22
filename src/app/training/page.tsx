"use client";

import { useState, useRef } from "react";
import { chatCompletionAction, transcribeAudioAction } from "./actions";
import interviewScript from "../../../public/interview_script.json";
import { Mic, Square, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function TrainingPage() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const playAudioStream = async (audioBase64: string) => {
    setIsPlaying(true);

    try {
      // Convert base64 back to audio buffer
      const audioData = Uint8Array.from(atob(audioBase64), (c) =>
        c.charCodeAt(0)
      );
      const audioBlob = new Blob([audioData], { type: "audio/mp3" });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Play the audio
      const audioElement = new Audio(audioUrl);
      audioElement.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl); // Clean up
      };

      await audioElement.play();
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlaying(false);
    }
  };

  const startInterview = async () => {
    const systemMessage = {
      role: "developer",
      content: [
        {
          type: "text",
          text: `
            You are an AI interviewer conducting a life story interview.
            You should follow the interview script provided, but feel free to
            ask natural follow-up questions based on the interviewee's responses.
            Maintain a warm, empathetic, and professional tone throughout the interview.
          `,
        },
      ],
    };

    const scriptMessage = {
      role: "developer",
      content: [
        {
          type: "text",
          text: `Here is your interview script: ${JSON.stringify(
            interviewScript
          )}`,
        },
      ],
    };

    const initialMessages = [systemMessage, scriptMessage];
    setMessages(initialMessages);

    const aiResponse = await chatCompletionAction(initialMessages);
    setMessages([...initialMessages, aiResponse]);
    setStarted(true);

    if (aiResponse.audioData) {
      await playAudioStream(aiResponse.audioData);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedMessages = [
      ...messages,
      {
        role: "user",
        content: [{ type: "text", text: userInput }],
      },
    ];
    setMessages(updatedMessages);
    setUserInput("");

    const aiResponse = await chatCompletionAction(updatedMessages);
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
      setIsProcessing(true);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-8">
          <h1 className="text-3xl font-bold tracking-tight">Clone Interview</h1>

          {!started ? (
            <Button
              onClick={startInterview}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-lg"
            >
              Start Interview
            </Button>
          ) : (
            <Card className="w-full bg-zinc-900 border-zinc-800">
              <div className="p-6 space-y-6">
                {/* Conversation Area */}
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {messages.map(
                    (msg, idx) =>
                      msg.role !== "developer" && (
                        <div
                          key={idx}
                          className={`flex ${
                            msg.role === "assistant"
                              ? "justify-start"
                              : "justify-end"
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
                              {msg.role === "assistant"
                                ? "AI Interviewer"
                                : "You"}
                            </p>
                            <p className="text-white">
                              {msg.content.map((c: any) => c.text).join(" ")}
                              {isPlaying &&
                                msg === messages[messages.length - 1] && (
                                  <span className="ml-2 animate-pulse">🔊</span>
                                )}
                            </p>
                          </div>
                        </div>
                      )
                  )}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      value={isProcessing ? "Transcribing..." : userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Type your response..."
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
          )}
        </div>
      </div>
    </div>
  );
}
