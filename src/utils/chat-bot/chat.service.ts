import mongoose from "mongoose";
import { callOpenRouter, ChatMessage } from "./index";

const SYSTEM_PROMPT = `You are a friendly, concise shopping assistant for an online store.
- Only talk about products, collections, sizing, pricing, and order status.
- If the CATALOG CONTEXT below has relevant items, base your answer on them and mention real names/prices — never invent products, prices, or stock that aren't listed.
- If nothing relevant is in the context, say you're not sure and suggest browsing the shop or contacting support — don't make something up.
- Keep replies short (2-4 sentences) and easy to scan in a chat widget.`;

/**
 * Pulls a handful of loosely-matching products from Mongo so the model has
 * real data to talk about instead of hallucinating. Adjust the field names
 * below ("name", "description", "category", "price") to match your actual
 * Product schema.
 */
async function getCatalogContext(userMessage: string): Promise<string> {
  try {
    // Reuses whatever Product model is already registered elsewhere in your
    // app (e.g. src/models/Product.ts) — no need to redefine the schema here.
    const Product = mongoose.model("Product");

    const keywords = userMessage
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 6);

    if (keywords.length === 0) return "";

    const regexes = keywords.map((k) => new RegExp(k, "i"));

    const products = await Product.find({
      $or: [
        { name: { $in: regexes } },
        { category: { $in: regexes } },
        { description: { $in: regexes } },
      ],
    })
      .limit(5)
      .select("name price category description")
      .lean();

    if (!products.length) return "";

    return products
      .map(
        (p: any) =>
          `- ${p.name} | Rs ${p.price} | ${p.category ?? "uncategorized"} | ${p.description ? String(p.description).slice(0, 120) : ""
          }`
      )
      .join("\n");
  } catch {
    // Product model not registered yet, or query failed — degrade gracefully
    // to a context-free reply rather than breaking the chat.
    return "";
  }
}

export async function getChatReply(
  userMessage: string,
  history: ChatMessage[] = []
): Promise<string> {
  const context = await getCatalogContext(userMessage);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: context
        ? `${SYSTEM_PROMPT}\n\nCATALOG CONTEXT:\n${context}`
        : SYSTEM_PROMPT,
    },
    ...history.slice(-6), // keep the payload small — last 3 exchanges
    { role: "user", content: userMessage },
  ];

  return callOpenRouter(messages);
}