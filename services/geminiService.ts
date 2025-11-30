import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DrawResult, VideoAnalysisResponse } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A concise summary of the user's story and the visual imagery they described.",
    },
    interpretation: {
      type: Type.STRING,
      description: "A deep psychological interpretation connecting the word card, the image, and the user's story. IMPORTANT: Use the third person perspective (e.g. 'The bird', 'The protagonist'). Do NOT use 'You'.",
    },
    guidance: {
      type: Type.STRING,
      description: "A gentle, forward-looking guidance or a question for the user to ponder, fostering self-growth.",
    },
    followUpQuestion: {
      type: Type.STRING,
      description: "A single, poignant, and open-ended question related to the story and interpretation. This question will be displayed on a screen for the user to answer in a video recording.",
    }
  },
  required: ["summary", "interpretation", "guidance", "followUpQuestion"],
};

const videoAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    transcription: {
      type: Type.STRING,
      description: "A transcript of what the user said in the video (or their written answer).",
    },
    emotionalFeedback: {
      type: Type.STRING,
      description: "Feedback on the user's emotional state, tone, and content observed.",
    },
    nextQuestion: {
      type: Type.STRING,
      description: "A follow-up question based on the user's answer, to be asked in the next round.",
    },
    finalClosing: {
      type: Type.STRING,
      description: "A final, warm closing statement summarizing the interaction.",
    }
  },
  required: ["transcription", "emotionalFeedback"],
};

export const analyzeOHCardStory = async (
  draw: DrawResult,
  userStory: string
): Promise<{ summary: string; interpretation: string; guidance: string; followUpQuestion: string } | null> => {
  try {
    const model = "gemini-2.5-flash";
    
    const prompt = `
    You are an expert OH Card facilitator and psychological counselor. 
    The user has drawn two cards (one image, one word) and told a story based on them.
    
    The Word Card is: "${draw.word.text}".
    
    The user's story is: "${userStory}".
    
    (Note: The user is looking at an abstract image card. Their story describes what they see. You do not see the image, but you must rely entirely on their projection and description of it in the story).

    Your task:
    1. Summarize the story.
    2. Interpret the subconscious projection. 
       **CRITICAL RULE FOR INTERPRETATION:** 
       Do NOT use the second person ("You", "Your") in the 'interpretation' field. 
       ALWAYS use the **third person** referring to the protagonist or object in the story (e.g., "The bird", "The child", "It", "He", "She"). 
       Analyze the story's character/subject as a projection of the user's state.
       Example: Instead of saying "You feel trapped", say "The bird in the story feels trapped".
    3. Provide warm, non-judgmental guidance.
    4. Generate a **Follow-up Question**. This should be a direct, thought-provoking question addressing the user (second person "You" is okay here) to help them deepen their self-awareness. It will be used as a prompt for them to record a video reflection.

    Output MUST be in JSON format matching the schema.
    Respond in the same language as the user's story (likely Chinese).
    `;

    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "You are a warm, empathetic, and insightful psychological counselor using OH Cards. Your interpretation must strictly analyze the story's protagonist in the third person.",
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};

// Helper to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:video/webm;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const analyzeVideoInteraction = async (
  videoBlob: Blob,
  context: {
    phase: 'round1' | 'round2',
    previousQuestion: string,
    previousTranscript?: string
  }
): Promise<VideoAnalysisResponse | null> => {
  try {
    const model = "gemini-2.5-flash";
    const base64Video = await blobToBase64(videoBlob);

    let prompt = "";
    if (context.phase === 'round1') {
      prompt = `
        The user has just recorded a video answering this question: "${context.previousQuestion}".
        
        Please:
        1. Transcribe what they said.
        2. Analyze their emotional tone and content.
        3. Provide brief, empathetic feedback.
        4. Generate a deeper, second follow-up question ('nextQuestion') to explore their answer further.
      `;
    } else {
      prompt = `
        The user has answered the second question: "${context.previousQuestion}".
        Previous context (Answer 1): "${context.previousTranscript}".
        
        Please:
        1. Transcribe what they said.
        2. Analyze their emotional tone.
        3. Provide a 'finalClosing' statement that summarizes their journey and offers encouragement.
      `;
    }

    const response = await genAI.models.generateContent({
      model: model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "video/webm",
                data: base64Video
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: videoAnalysisSchema,
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;

  } catch (error) {
    console.error("Gemini Video Analysis Failed:", error);
    throw error;
  }
};

export const analyzeTextInteraction = async (
  text: string,
  context: {
    phase: 'round1' | 'round2',
    previousQuestion: string,
    previousAnswer?: string
  }
): Promise<VideoAnalysisResponse | null> => {
  try {
    const model = "gemini-2.5-flash";
    
    let prompt = "";
    if (context.phase === 'round1') {
      prompt = `
        The user has provided a written answer to the question: "${context.previousQuestion}".
        User's Answer: "${text}"
        
        Please:
        1. Analyze their emotional tone and content.
        2. Provide brief, empathetic feedback.
        3. Generate a deeper, second follow-up question ('nextQuestion') to explore their answer further.
        
        Output must be JSON matching the schema. 
        For 'transcription', simply echo the user's answer.
      `;
    } else {
      prompt = `
        The user has answered the second question: "${context.previousQuestion}".
        User's Answer: "${text}"
        Previous context (Answer 1): "${context.previousAnswer}".
        
        Please:
        1. Analyze their emotional tone.
        2. Provide a 'finalClosing' statement that summarizes their journey and offers encouragement.
        
        Output must be JSON matching the schema.
        For 'transcription', simply echo the user's answer.
      `;
    }

    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: videoAnalysisSchema,
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;

  } catch (error) {
    console.error("Gemini Text Analysis Failed:", error);
    throw error;
  }
};