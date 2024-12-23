export interface MessageContent {
    type: string;
    text: string;
  }
  
  export interface ChatMessage {
    role: string;
    content: MessageContent[];
    audioData?: string;
  }