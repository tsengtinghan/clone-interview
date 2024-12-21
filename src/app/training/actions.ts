"use server";

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], 
});

export async function chatCompletionAction(messages: any[]) {
  // Transform your messages array into the format that OpenAI expects:
  // [
  //   { role: "user", content: "Hello" },
  //   { role: "assistant", content: "Hi! How can I help?" },
  //   ...
  // ]
  const transformedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content.map((c: any) => c.text).join(" ")
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: transformedMessages
  });

  const assistantMessage = response.choices[0].message;
  // Convert the assistant message back into your internal format
  return {
    role: "assistant",
    content: [{ type: "text", text: assistantMessage?.content || "" }]
  };
}
