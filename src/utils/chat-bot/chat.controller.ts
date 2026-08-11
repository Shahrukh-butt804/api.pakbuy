import { getChatReply } from "./chat.service";
import { OpenRouterRateLimitError } from "./index";


export const handleChat = async (req: any, res: any): Promise<any> => {
  try {
    const { message, history } = req.body as {
      message?: string;
      history?: {
        role: "user" | "assistant";
        content: string;
      }[];
    };

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "message is required",
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        error: "message is too long",
      });
    }

    const reply = await getChatReply(
      message.trim(),
      (history || []).map((h) => ({
        role: h.role,
        content: h.content,
      })),
      req.user || undefined,
    );

    return res.status(200).json({ reply });
  } catch (err) {
    if (err instanceof OpenRouterRateLimitError) {
      return res.status(429).json({
        error: "The assistant is a bit busy right now — try again in a moment.",
      });
    }

    console.error("Chat error:", err);

    return res.status(500).json({
      error: "Something went wrong. Please try again.",
    });
  }
};