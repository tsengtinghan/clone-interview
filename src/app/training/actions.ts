"use server";

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

export async function chatCompletionAction(messages: any[]) {
  const transformedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content.map((c: any) => c.text).join(" "),
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: transformedMessages,
  });

  const messageText = response.choices[0].message?.content || "";

  // Get audio stream
  const speechResponse = await openai.audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: messageText,
  });

  // Convert to base64
  const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
  const audioBase64 = audioBuffer.toString("base64");

  return {
    role: "assistant",
    content: [{ type: "text", text: messageText }],
    audioData: audioBase64,
  };
}
