"use client";

import { useState, useRef } from "react";
import {
  chatCompletionAction,
  transcribeAudioAction,
  summarizeConversationAction,
} from "./actions";
import interviewScript from "../../../public/interview_script.json";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/chat-interface";

export default function TrainingPage() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLLMProcessing, setIsLLMProcessing] = useState(false);
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
    setStarted(true);
    setIsLLMProcessing(true);

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

    try {
      const aiResponse = await chatCompletionAction(initialMessages);
      setMessages([...initialMessages, aiResponse]);

      if (aiResponse.audioData) {
        await playAudioStream(aiResponse.audioData);
      }
    } catch (error) {
      console.error("Error starting interview:", error);
      // Optionally handle the error state here
    } finally {
      setIsLLMProcessing(false);
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

  const endInterview = async () => {
    const conversationHistory = messages.filter(
      (msg) => msg.role !== "developer"
    );

    if (typeof window !== "undefined") {
      localStorage.setItem(
        "raw_conversation",
        JSON.stringify(conversationHistory)
      );

      try {
        const summary = await summarizeConversationAction(conversationHistory);
        localStorage.setItem("conversation_summary", JSON.stringify(summary));
        // Reset states
        setStarted(false);
        setMessages([]);
        setUserInput("");
        setIsPlaying(false);
        setIsRecording(false);
        setIsProcessing(false);
      } catch (error) {
        console.error("Error generating summary:", error);
        // Still end the interview even if summary fails
        setStarted(false);
        setMessages([]);
        setUserInput("");
      }
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="w-full flex items-center justify-center">
            <h1 className="text-3xl font-bold tracking-tight">
              Clone Interview
            </h1>
            {started && (
              <Button
                onClick={endInterview}
                variant="destructive"
                className="bg-red-500 hover:bg-red-600"
              >
                <X className="h-4 w-4 mr-2" />
                End Interview
              </Button>
            )}
          </div>

          {!started ? (
            <Button
              onClick={startInterview}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-lg"
              disabled={isLLMProcessing}
            >
              {isLLMProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Start Interview
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
                  const aiResponse = await chatCompletionAction(
                    updatedMessages
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
