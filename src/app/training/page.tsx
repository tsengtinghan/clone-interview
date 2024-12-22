"use client";

import { useState, useRef } from "react";
import { chatCompletionAction, transcribeAudioAction } from "./actions";
import interviewScript from "../../../public/interview_script.json";

export default function TrainingPage() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
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
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/mp3",
        });

        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result?.toString().split(",")[1];
          if (base64Audio) {
            // Get transcription
            const transcription = await transcribeAudioAction(base64Audio);

            // Update input with transcription
            setUserInput(transcription);
          }
        };

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
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

  return (
    <div>
      <h1>Training Page</h1>

      {!started ? (
        <button onClick={startInterview}>Start Interview</button>
      ) : (
        <>
          <div className="conversation">
            {messages.map((msg, idx) => (
              <p key={idx}>
                {msg.role !== "developer" && (
                  <>
                    <strong>{msg.role}:</strong>{" "}
                    {msg.content.map((c: any) => c.text).join(" ")}
                    {isPlaying && msg === messages[messages.length - 1] && (
                      <span> 🔊</span>
                    )}
                  </>
                )}
              </p>
            ))}
          </div>

          <form onSubmit={handleSend} className="input-area">
            <div className="input-group">
              <input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your message"
                disabled={isPlaying || isRecording}
              />
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isPlaying}
                className={isRecording ? "recording" : ""}
              >
                {isRecording ? "⏹️ Stop" : "🎤 Record"}
              </button>
            </div>
            <button type="submit" disabled={isPlaying || isRecording}>
              Send
            </button>
          </form>

          {isRecording && (
            <div className="recording-indicator">Recording... 🔴</div>
          )}
        </>
      )}

      <style jsx>{`
        .input-area {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .input-group {
          display: flex;
          gap: 10px;
        }
        .recording {
          background-color: #ff4444;
          color: white;
        }
        .recording-indicator {
          margin-top: 10px;
          color: #ff4444;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
