"use client";

import { useState } from "react";
import { chatCompletionAction } from "./actions";
import interviewScript from "../../../public/interview_script.json";

export default function TrainingPage() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

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

    // Initialize conversation with system messages and first question
    const initialMessages = [systemMessage, scriptMessage];
    setMessages(initialMessages);

    // Get AI's first question
    const aiResponse = await chatCompletionAction(initialMessages);
    setMessages([...initialMessages, aiResponse]);
    setStarted(true);

    // Play the audio
    if (aiResponse.audioUrl) {
      const audio = new Audio(aiResponse.audioUrl);
      audio.play();
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Add the new user message to the conversation
    const updatedMessages = [
      ...messages,
      {
        role: "user",
        content: [{ type: "text", text: userInput }],
      },
    ];
    setMessages(updatedMessages);

    // 2. Call the server action to get AI response
    const aiResponse = await chatCompletionAction(updatedMessages);

    // 3. Append the AI response to local messages
    setMessages([...updatedMessages, aiResponse]);

    // Play the audio
    if (aiResponse.audioUrl) {
      const audio = new Audio(aiResponse.audioUrl);
      audio.play();
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
    }

    setUserInput("");
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
