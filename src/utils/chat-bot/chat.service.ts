import mongoose from "mongoose";
import { callOpenRouter, ChatMessage } from ".";

const SYSTEM_PROMPT = `You are a friendly, concise shopping assistant for an online store that sells curated collections (bundles), not individual products.
- Only talk about collections, what's included in each, pricing, and order status.
- If the CATALOG CONTEXT below has relevant collections, base your answer on them and mention real names/prices — never invent collections, prices, or contents that aren't listed.
- If nothing relevant is in the context, say you're not sure and suggest browsing the shop or contacting support — don't make something up.
- Keep replies short (2-4 sentences) and easy to scan in a chat widget.`;

/**
 * Pulls a handful of loosely-matching collections from Mongo so the model
 * has real data to talk about instead of hallucinating. Adjust field names
 * only if your Collection schema changes — this matches the schema you
 * shared (name, title, description[], slogan, about, CollectionPrice, products[]).
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function getCatalogContext(userMessage: string): Promise<string> {
  try {
    // Reuses whatever Collection model is already registered elsewhere in
    // your app (e.g. src/models/Collection.ts) — no need to redefine the
    // schema here.
    const Collection = mongoose.model("Collection");

    const keywords = userMessage
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 6);

    const regexes = keywords.map((k) => new RegExp(k, "i"));

    let collections = keywords.length
      ? await Collection.find({
        $or: [
          { name: { $in: regexes } },
          { title: { $in: regexes } },
          { slogan: { $in: regexes } },
          { about: { $in: regexes } },
          { "description.heading": { $in: regexes } },
          { "description.text": { $in: regexes } },
        ],
      })
        .limit(5)
        .select("name title slogan about description CollectionPrice products")
        .populate({ path: "products", select: "name", options: { limit: 8 } })
        .lean()
      : [];

    // No keyword match (or a generic question like "what do you sell?") —
    // fall back to a general sample so the bot still has something real to
    // ground its answer in instead of saying nothing.
    if (!collections.length) {
      collections = await Collection.find({})
        .limit(5)
        .select("name title slogan about description CollectionPrice products")
        .populate({ path: "products", select: "name", options: { limit: 8 } })
        .lean();
    }

    if (!collections.length) return "";

    return collections
      .map((c: any) => {
        const descBlocks = (c.description || [])
          .map((d: any) => `${d.heading}: ${d.text}`)
          .join(" | ");
        const about = c.about ? stripHtml(c.about).slice(0, 400) : "";
        const productNames = (c.products || [])
          .map((p: any) => p.name)
          .filter(Boolean)
          .join(", ");

        return [
          `Collection: ${c.title} (${c.name})`,
          `Slogan: ${c.slogan}`,
          `Price: Rs ${c.CollectionPrice ?? 0}`,
          descBlocks && `Highlights: ${descBlocks}`,
          about && `About: ${about}`,
          productNames && `Includes: ${productNames}`,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n---\n");
  } catch {
    // Collection model not registered yet, or query failed — degrade
    // gracefully to a context-free reply rather than breaking the chat.
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