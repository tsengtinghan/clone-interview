"use server";

import OpenAI from "openai";
import { ChatMessage } from "@/lib/type";

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

export async function chatWithCloneAction(
  messages: ChatMessage[],
  summary: any
) {
  // Create system message that instructs the AI how to behave based on the summary
  const systemMessage = {
    role: "developer",
    content: [
      {
        type: "text",
        text: `You are a digital clone of a person with the following characteristics:
      ${JSON.stringify(summary, null, 2)}
      
      Behave and respond as if you are this person. Use their background, experiences, 
      and personality traits to inform your responses. Maintain a consistent personality 
      based on the information provided. If asked about something not covered in your 
      background, politely indicate that you don't recall or prefer not to discuss it.
      
      Keep responses natural and conversational, occasionally referencing relevant 
      experiences from your background when appropriate.`,
      },
    ],
  };

  // Transform messages to the format OpenAI expects
  const transformedMessages = [
    systemMessage,
    ...messages.map((m) => ({
      role: m.role,
      content: m.content.map((c: any) => c.text).join(" "),
    })),
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: transformedMessages,
  });

  const messageText = response.choices[0].message?.content || "";

  // Get audio version of the response
  const speechResponse = await openai.audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: messageText,
  });

  // Convert audio to base64
  const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
  const audioBase64 = audioBuffer.toString("base64");

  return {
    role: "assistant",
    content: [{ type: "text", text: messageText }],
    audioData: audioBase64,
  };
}

export async function transcribeAudioAction(audioBase64: string) {
  try {
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioBase64, "base64");

    // Create a File object instead of Blob
    const file = new File([audioBuffer], "audio.mp3", { type: "audio/mp3" });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
    });

    return transcription.text;
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
}

export async function generateIntroductionAction(summary: any) {
  const systemMessage = [
    {
      role: "developer",
      content: `You are a digital clone of a person with the following characteristics:
      ${JSON.stringify(summary, null, 2)}
      
      Generate a short introduction of yourself to someone who wants to chat 
      with you. Include relevant personal details. Make it conversational and inviting, but the introduction should just be one or two sentence max.`,
    },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: systemMessage,
  });

  const messageText = response.choices[0].message?.content || "";

  // Get audio version of the introduction
  const speechResponse = await openai.audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: messageText,
  });

  // Convert audio to base64
  const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
  const audioBase64 = audioBuffer.toString("base64");

  return {
    role: "assistant",
    content: [{ type: "text", text: messageText }],
    audioData: audioBase64,
  };
}
