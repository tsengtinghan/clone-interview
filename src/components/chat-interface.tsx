"use client";

import { Mic, Square, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface Message {
  role: string;
  content: { type: string; text: string }[];
  audioData?: string;
}

interface ChatInterfaceProps {
  messages: Message[];
  isPlaying: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  isLLMProcessing: boolean;
  onSendMessage: (message: string) => Promise<void>;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => void;
  userInput: string;
  onUserInputChange: (value: string) => void;
  className?: string;
}

export function ChatInterface({
  messages,
  isPlaying,
  isRecording,
  isProcessing,
  isLLMProcessing,
  onSendMessage,
  onStartRecording,
  onStopRecording,
  userInput,
  onUserInputChange,
  className = "",
}: ChatInterfaceProps) {
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    await onSendMessage(userInput);
  };

  return (
    <Card className={`w-full bg-zinc-900 border-zinc-800 ${className}`}>
      <div className="p-6 space-y-6">
        {/* Conversation Area */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {messages.map(
            (msg, idx) =>
              msg.role !== "developer" && (
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
                    <p className="text-sm text-zinc-200 mb-1">
                      {msg.role === "assistant" ? "AI Interviewer" : "You"}
                    </p>
                    <p className="text-white">
                      {msg.content.map((c) => c.text).join(" ")}
                      {isPlaying && msg === messages[messages.length - 1] && (
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
              value={userInput}
              onChange={(e) => onUserInputChange(e.target.value)}
              placeholder="Type your response..."
              disabled={isPlaying || isRecording}
              className="flex-1 bg-zinc-800 border-zinc-700 text-white"
            />
            <Button
              type="button"
              onClick={isRecording ? onStopRecording : onStartRecording}
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
              disabled={
                isPlaying || isRecording || !userInput.trim() || isLLMProcessing
              }
              className="bg-orange-500 hover:bg-orange-600 p-3"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </form>

        {/* Status Indicators */}
        <div className="space-y-2">
          {isRecording && (
            <div className="flex items-center justify-center text-red-500 animate-pulse">
              <span className="mr-2">●</span> Recording
            </div>
          )}
          {isProcessing && (
            <div className="flex items-center justify-center text-yellow-500 animate-pulse">
              <span className="mr-2">●</span> Transcribing audio...
            </div>
          )}
          {isLLMProcessing && (
            <div className="flex items-center justify-center text-blue-500 animate-pulse">
              <span className="mr-2">●</span> AI is thinking...
            </div>
          )}
          {isPlaying && (
            <div className="flex items-center justify-center text-green-500 animate-pulse">
              <span className="mr-2">●</span> Speaking...
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
