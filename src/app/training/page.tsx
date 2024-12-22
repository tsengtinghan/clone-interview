"use client";

import { useState } from "react";
import { chatCompletionAction } from "./actions";
import interviewScript from "../../../public/interview_script.json";

export default function TrainingPage() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

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

          <form onSubmit={handleSend}>
            <input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your message"
              disabled={isPlaying}
            />
            <button type="submit" disabled={isPlaying}>
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}
