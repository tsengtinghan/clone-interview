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

export async function summarizeConversationAction(messages: any[]) {
  const systemMessage = {
    role: "developer",
    content: `
          Analyze the conversation history and create a detailed summary of the person being interviewed.
          Return the response as a JSON object with the following structure:
          {
            "personalInfo": {
              "name": "if mentioned",
              "age": "if mentioned",
              "occupation": "current job",
              "location": "where they live",
              "familyStatus": "relationship/family details"
            },
            "background": {
              "education": "educational background",
              "careerPath": "career progression",
              "significantLifeEvents": []
            },
            "personality": {
              "traits": [],
              "values": [],
              "interests": [],
              "challenges": "current or past challenges mentioned"
            },
            "relationships": {
              "family": [],
              "friends": [],
              "professional": []
            },
            "narratives": [
              {
                "topic": "topic of the story",
                "context": "when/where",
                "details": "key points from their story"
              }
            ]
          }
          Include only information that was actually mentioned in the conversation.
          For fields where information wasn't provided, use null or empty arrays.
        `,
  };

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
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message?.content || "{}");
}
