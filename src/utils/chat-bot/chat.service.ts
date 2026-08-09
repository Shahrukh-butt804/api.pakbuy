import mongoose from "mongoose";
import { callOpenRouter, ChatMessage } from ".";
import { addToCart, CollectionNotFoundError, getCart, removeFromCart, updateQuantity } from "./cart.service";
import { SYSTEM_PROMPT } from "./prompts/systemPrompt";

export interface AuthenticatedUser {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email?: string;
  paymentSource?: unknown | null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// async function getCatalogContext(userMessage: string): Promise<string> {
//   try {
//     // Reuses whatever Collection model is already registered elsewhere in
//     // your app (e.g. src/models/Collection.ts) — no need to redefine the
//     // schema here.
//     const Collection = mongoose.model("Collection");

//     const keywords = userMessage
//       .split(/\s+/)
//       .filter((w) => w.length > 2)
//       .slice(0, 6);

//     const regexes = keywords.map((k) => new RegExp(k, "i"));

//     let collections = keywords.length
//       ? await Collection.find({
//         $or: [
//           { name: { $in: regexes } },
//           { title: { $in: regexes } },
//           { slogan: { $in: regexes } },
//           { about: { $in: regexes } },
//           { "description.heading": { $in: regexes } },
//           { "description.text": { $in: regexes } },
//         ],
//       })
//         .limit(5)
//         .select("name title slogan about description CollectionPrice products")
//         .populate({ path: "products", select: "name", options: { limit: 8 } })
//         .lean()
//       : [];

//     // No keyword match (or a generic question like "what do you sell?") —
//     // fall back to a general sample so the bot still has something real to
//     // ground its answer in instead of saying nothing.
//     if (!collections.length) {
//       collections = await Collection.find({})
//         .limit(5)
//         .select("name title slogan about description CollectionPrice products")
//         .populate({ path: "products", select: "name", options: { limit: 8 } })
//         .lean();
//     }

//     if (!collections.length) return "";

//     return collections
//       .map((c: any) => {
//         const descBlocks = (c.description || [])
//           .map((d: any) => `${d.heading}: ${d.text}`)
//           .join(" | ");
//         const about = c.about ? stripHtml(c.about).slice(0, 400) : "";
//         const productNames = (c.products || [])
//           .map((p: any) => p.name)
//           .filter(Boolean)
//           .join(", ");

//         return [
//           `Collection: ${c.title} (${c.name})`,
//           `Slogan: ${c.slogan}`,
//           `Price: Rs ${c.CollectionPrice ?? 0}`,
//           descBlocks && `Highlights: ${descBlocks}`,
//           about && `About: ${about}`,
//           productNames && `Includes: ${productNames}`,
//         ]
//           .filter(Boolean)
//           .join("\n");
//       })
//       .join("\n---\n");
//   } catch {
//     // Collection model not registered yet, or query failed — degrade
//     // gracefully to a context-free reply rather than breaking the chat.
//     return "";
//   }
// }

async function getCatalogContext(userMessage: string): Promise<string> {
  try {
    const Collection = mongoose.model("Collection");

    const keywords = userMessage
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 6);

    const regexes = keywords.map(
      (k) => new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
    );

    let collections = keywords.length
      ? await Collection.find({
        $or: [
          { title: { $in: regexes } },
          { slogan: { $in: regexes } },
          { about: { $in: regexes } },
          { "description.heading": { $in: regexes } },
          { "description.text": { $in: regexes } },
        ],
      })
        .limit(5)
        .select("title slogan about description CollectionPrice products")
        .populate({
          path: "products",
          select: "name",
          options: { limit: 8 },
        })
        .lean()
      : [];

    // No keyword match — provide a few real collections
    // so the assistant has actual catalog data to work with.
    if (!collections.length) {
      collections = await Collection.find({})
        .limit(5)
        .select("title slogan about description CollectionPrice products")
        .populate({
          path: "products",
          select: "name",
          options: { limit: 8 },
        })
        .lean();
    }

    if (!collections.length) return "";

    return collections
      .map((c: any) => {
        const descBlocks = (c.description || [])
          .map((d: any) => `${d.heading}: ${d.text}`)
          .join(" | ");

        const about = c.about
          ? stripHtml(c.about).slice(0, 400)
          : "";

        const productNames = (c.products || [])
          .map((p: any) => p.name)
          .filter(Boolean)
          .join(", ");

        return [
          `Collection Title: ${c.title}`,
          `Slogan: ${c.slogan || ""}`,
          `Price: Rs ${c.CollectionPrice ?? 0}`,
          descBlocks && `Highlights: ${descBlocks}`,
          about && `About: ${about}`,
          productNames && `Includes: ${productNames}`,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n---\n");
  } catch (error) {
    console.error("Catalog context error:", error);

    return "";
  }
}

async function getUserCartContext(user?: AuthenticatedUser): Promise<string> {
  if (!user?._id) {
    return "USER CART: User is not logged in.";
  }

  try {
    const cart: any = await getCart(user._id.toString());

    if (!cart.items?.length) {
      return "USER CART: The user's cart is empty.";
    }

    const items = cart.items
      .map((item: any) => {
        const collection = item.collection;

        if (!collection) return null;

        return [
          `Collection: ${collection.title}`,
          `Quantity: ${item.quantity}`,
          `Unit Price: Rs ${collection.CollectionPrice ?? 0}`,
          `Subtotal: Rs ${item.subTotal ?? 0}`,
        ].join("\n");
      })
      .filter(Boolean)
      .join("\n---\n");

    return [
      "USER CART:",
      items,
      `Cart Total: Rs ${cart.totalAmount ?? 0}`,
    ].join("\n");
  } catch (error) {
    console.error("Cart context error:", error);

    return "USER CART: Unable to retrieve the user's cart.";
  }
}

interface CartAction {
  action: "add_to_cart" | "update_cart" | "remove_from_cart";
  collectionTitle: string;
  quantity?: number;
}

function tryParseCartAction(reply: string): CartAction | null {
  const trimmed = reply.trim();

  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);

    const validActions = [
      "add_to_cart",
      "update_cart",
      "remove_from_cart",
    ];

    if (
      validActions.includes(parsed?.action) &&
      typeof parsed.collectionTitle === "string"
    ) {
      if (
        parsed.action === "remove_from_cart"
      ) {
        return parsed as CartAction;
      }

      if (
        Number.isInteger(parsed.quantity) &&
        parsed.quantity > 0
      ) {
        return parsed as CartAction;
      }

      return null;
    }

    return null;
  } catch {
    return null;
  }
}

export async function getChatReply(
  userMessage: string,
  history: ChatMessage[] = [],
  user?: AuthenticatedUser,
): Promise<string> {
  const context = await getCatalogContext(userMessage);
  const cartContext = await getUserCartContext(user);


  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `
            ${SYSTEM_PROMPT}

            CATALOG CONTEXT:
            ${context || "No catalog context available."}

            ${cartContext}
   `,
    },

    ...history.slice(-6),

    {
      role: "user",
      content: userMessage,
    },
  ];

  const reply = await callOpenRouter(messages);
  const action = tryParseCartAction(reply);

  if (!action) return reply;

  // Model wants to add something to cart.
  if (!user?._id) {
    return "You'll need to be logged in for me to add that to your cart — want to log in first?";
  }


  try {
    const userId = user._id.toString();

    // ADD
    if (action.action === "add_to_cart") {
      const cart: any = await addToCart(
        userId,
        action.collectionTitle,
        action.quantity || 1
      );

      return `Added "${action.collectionTitle}" to your cart${action.quantity && action.quantity > 1
        ? ` (x${action.quantity})`
        : ""
        }. Your cart total is now Rs ${cart.totalAmount}.`;
    }

    // UPDATE
    if (action.action === "update_cart") {
      const cart: any = await updateQuantity(
        userId,
        action.collectionTitle,
        action.quantity!
      );

      return `Updated "${action.collectionTitle}" to ${action.quantity
        } in your cart. Your cart total is now Rs ${cart.totalAmount
        }.`;
    }

    // REMOVE
    if (action.action === "remove_from_cart") {
      const cart: any = await removeFromCart(
        userId,
        action.collectionTitle
      );

      return `Removed "${action.collectionTitle}" from your cart. Your cart total is now Rs ${cart.totalAmount
        }.`;
    }

    return reply;
  } catch (err) {
    if (err instanceof CollectionNotFoundError) {
      return `I couldn't find "${action.collectionTitle}" in the catalog — could you double check the title?`;
    }

    console.error("Cart action error:", err);

    return "I tried to update your cart but something went wrong — please try again.";
  }

}