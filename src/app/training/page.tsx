"use client";

import { useState } from "react";
import { chatCompletionAction } from "./actions";

export default function TrainingPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [userInput, setUserInput] = useState("");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Add the new user message to the conversation
    const updatedMessages = [
      ...messages,
      {
        role: "user",
        content: [{ type: "text", text: userInput }]
      }
    ];
    setMessages(updatedMessages);

    // 2. Call the server action to get AI response
    const aiResponse = await chatCompletionAction(updatedMessages);

    // 3. Append the AI response to local messages
    setMessages([...updatedMessages, aiResponse]);

    setUserInput("");
  };

  return (
    <div>
      <h1>Training Page</h1>
      <div className="conversation">
        {messages.map((msg, idx) => (
          <p key={idx}>
            <strong>{msg.role}:</strong>{" "}
            {msg.content.map((c: any) => c.text).join(" ")}
          </p>
        ))}
      </div>

      <form onSubmit={handleSend}>
        <input
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your message"
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
