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
