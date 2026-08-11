import mongoose from "mongoose";
import { callOpenRouter, ChatMessage } from ".";
import { addToCart, CollectionNotFoundError, getCart, removeFromCart, updateQuantity } from "./cart.service";
import { SYSTEM_PROMPT } from "./prompts/systemPrompt";
import { createOrder, getLastOrder, getOrderSummary, getUserOrders, OrderError } from "./orderService/orderService";

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

interface AgentAction {
  action:
  | "add_to_cart"
  | "update_cart"
  | "remove_from_cart"
  | "place_order"
  | "get_cart"
  | "get_orders"
  | "get_last_order"
  | "get_order_status"
  | "get_order_summary";

  collectionTitle?: string | any;
  quantity?: number;
  orderId?: string;
}

function tryParseCartAction(reply: string): AgentAction | null {
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
      "place_order",
      "get_cart",
      "get_orders",
      "get_last_order",
      "get_order_status",
      "get_order_summary",
    ];

    if (!validActions.includes(parsed?.action)) {
      return null;
    }

    if (parsed.action === "place_order") {
      return {
        action: "place_order",
      };
    }

    if (
      ["add_to_cart", "update_cart", "remove_from_cart"].includes(
        parsed.action
      )
    ) {
      if (typeof parsed.collectionTitle !== "string") {
        return null;
      }

      if (parsed.action === "remove_from_cart") {
        return {
          action: parsed.action,
          collectionTitle: parsed.collectionTitle,
        };
      }

      if (
        !Number.isInteger(parsed.quantity) ||
        parsed.quantity <= 0
      ) {
        return null;
      }

      return {
        action: parsed.action,
        collectionTitle: parsed.collectionTitle,
        quantity: parsed.quantity,
      };
    }

    return parsed as AgentAction;
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

    if (action.action === "place_order") {
      const order = await createOrder(userId);

      return `Your order has been placed successfully. Your order ID is ${order._id}.`;
    }

    if (action.action === "get_orders") {
      const orders = await getUserOrders(userId);

      if (!orders.length) {
        return "You haven't placed any orders yet.";
      }

      // Convert backend data into safe context for the model
    }

    if (action.action === "get_last_order") {
      const order = await getLastOrder(userId);

      if (!order) {
        return "You haven't placed any orders yet.";
      }

      // return order information
    }

    if (action.action === "get_order_summary") {
      const summary = await getOrderSummary(userId);

      return `You have placed ${summary.totalOrders} orders with a total spending of Rs ${summary.totalSpent}.`;
    }


    return reply;
  } catch (err) {
    if (err instanceof CollectionNotFoundError) {
      return err.message
    }

    if (err instanceof OrderError) {
      return err.message;
    }

    console.error("Cart action error:", err);

    return "I tried to update your cart but something went wrong — please try again.";
  }

}