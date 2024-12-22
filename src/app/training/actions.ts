"use server";

import OpenAI from "openai";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

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

  const assistantMessage = response.choices[0].message;
  const messageText = assistantMessage?.content || "";

  const speechFile = `speech-${uuidv4()}.mp3`;
  const publicPath = path.join(process.cwd(), "public", "audio", speechFile);

  const speechResponse = await openai.audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: messageText,
  });

  const buffer = Buffer.from(await speechResponse.arrayBuffer());
  await writeFile(publicPath, buffer);

  return {
    role: "assistant",
    content: [{ type: "text", text: messageText }],
    audioUrl: `/audio/${speechFile}`,
  };
}
