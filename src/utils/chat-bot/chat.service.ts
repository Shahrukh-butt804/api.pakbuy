import mongoose from "mongoose";
import { callOpenRouter, ChatMessage } from ".";
import { addToCart, CollectionNotFoundError, getCart, removeFromCart, updateQuantity } from "./cart.service";
import { SYSTEM_PROMPT } from "./prompts/systemPrompt";
import { createOrder, findOrder, getFirstOrder, getLastOrder, getOrderSummary, getUserOrders, OrderError } from "./orderService/orderService";

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
  | "get_first_order"
  | "get_order_status"
  | "get_order_summary"
  | "find_order";

  // Cart
  collectionTitle?: string | any;
  quantity?: number;

  // Order search
  orderId?: string;
  date?: string;
  status?: "pending" | "confirmed" | "dispatched" | "delivered" | "cancelled";
  totalAmount?: number;
  productCount?: number;
}

function normalizeJsonLikeReply(reply: string): string {
  let cleaned = reply.trim();

  if (!cleaned) return "";

  cleaned = cleaned.replace(/^```\s*(json)?\s*/i, "").replace(/\s*```$/i, "");

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return cleaned;
}

function looksLikeJsonPayload(reply: string): boolean {
  const cleaned = reply.trim();
  if (!cleaned) return false;

  return /^```\s*json/i.test(cleaned)
    || /^json\s*\{/i.test(cleaned)
    || /^\{/.test(cleaned)
    || /\{"action"\s*:/i.test(cleaned);
}

function looksLikeSafetyRefusal(text: string): boolean {
  const value = text.toLowerCase();
  return [
    "i can\'t help",
    "i can’t help",
    "i cannot help",
    "safety",
    "unsafe",
    "content policy",
    "not able to assist",
    "not able to do that",
    "sorry, i can\'t",
    "i\'m sorry, i can\'t",
    "i\'m sorry, but i can\'t",
    "policy violation",
  ].some((pattern) => value.includes(pattern));
}

function parseDirectUserIntent(userMessage: string): AgentAction | null {
  const text = userMessage.trim();
  const lower = text.toLowerCase();

  if (/\bplace order\b|\bcheckout\b|\bcomplete my order\b/.test(lower)) {
    return { action: "place_order" };
  }

  if (/\bshow my cart\b|\bwhat.*cart\b|\bmy cart\b/.test(lower)) {
    return { action: "get_cart" };
  }

  if (/\bmy orders\b|\border history\b|\bshow my orders\b/.test(lower)) {
    return { action: "get_orders" };
  }

  if (/\blast order\b|\bmost recent order\b/.test(lower)) {
    return { action: "get_last_order" };
  }

  if (/\bfirst order\b|\bearliest order\b/.test(lower)) {
    return { action: "get_first_order" };
  }

  const addMatch = text.match(/(?:add|put)\s+(?:\d+\s+)?(.+?)\s+(?:to|in)\s+my\s+cart/i);
  if (addMatch) {
    const collectionTitle = addMatch[1].replace(/[\s,;.!?]+$/g, "").trim();
    const quantity = text.match(/(?:add|put)\s+(\d+)\s+/i)?.[1];
    return { action: "add_to_cart", collectionTitle, quantity: quantity ? Number(quantity) : 1 };
  }

  const updateMatch = text.match(/(?:update|change|set)\s+(?:the\s+)?(.+?)\s+(?:to|=)\s*(\d+)\s*(?:qty|quantity)?/i);
  if (updateMatch) {
    const collectionTitle = updateMatch[1].replace(/[\s,;.!?]+$/g, "").trim();
    const quantity = Number(updateMatch[2]);
    if (collectionTitle && Number.isInteger(quantity) && quantity > 0) {
      return { action: "update_cart", collectionTitle, quantity };
    }
  }

  const removeMatch = text.match(/(?:remove|delete)\s+(?:the\s+)?(.+?)\s+from\s+my\s+cart/i);
  if (removeMatch) {
    const collectionTitle = removeMatch[1].replace(/[\s,;.!?]+$/g, "").trim();
    if (collectionTitle) {
      return { action: "remove_from_cart", collectionTitle };
    }
  }

  return null;
}

function tryParseCartAction(reply: string): AgentAction | null {
  const normalized = normalizeJsonLikeReply(reply);

  if (!normalized.startsWith("{") || !normalized.endsWith("}")) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized);

    const validActions = [
      "add_to_cart",
      "update_cart",
      "remove_from_cart",
      "place_order",
      "get_cart",
      "get_orders",
      "get_last_order",
      "get_first_order",
      "get_order_status",
      "get_order_summary",
      "find_order",
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

  const directIntent = parseDirectUserIntent(userMessage);
  const reply = await callOpenRouter(messages);

  if (looksLikeSafetyRefusal(reply) && directIntent) {
    const action = directIntent;
    if (!user?._id) {
      return "You’ll need to be logged in for me to add that to your cart — want to log in first?";
    }

    try {
      const userId = user._id.toString();

      if (action.action === "add_to_cart") {
        const cart: any = await addToCart(userId, action.collectionTitle, action.quantity || 1);
        return `Added "${action.collectionTitle}" to your cart${action.quantity && action.quantity > 1 ? ` (x${action.quantity})` : ""}. Your cart total is now Rs ${cart.totalAmount}.`;
      }

      if (action.action === "update_cart") {
        const cart: any = await updateQuantity(userId, action.collectionTitle, action.quantity!);
        return `Updated "${action.collectionTitle}" to ${action.quantity} in your cart. Your cart total is now Rs ${cart.totalAmount}.`;
      }

      if (action.action === "remove_from_cart") {
        const cart: any = await removeFromCart(userId, action.collectionTitle);
        return `Removed "${action.collectionTitle}" from your cart. Your cart total is now Rs ${cart.totalAmount}.`;
      }

      if (action.action === "place_order") {
        const order = await createOrder(userId);
        return `Your order has been placed successfully. Your order ID is ${order._id}.`;
      }

      if (action.action === "get_cart") {
        const cart: any = await getCart(userId);
        if (!cart.items?.length) return "Your cart is empty.";
        return `Your cart total is Rs ${cart.totalAmount}.`;
      }

      if (action.action === "get_orders") {
        const orders: any[] = await getUserOrders(userId);
        if (!orders.length) return "You haven’t placed any orders yet.";
        return `You have ${orders.length} order${orders.length === 1 ? "" : "s"}.`;
      }

      if (action.action === "get_last_order") {
        const order: any = await getLastOrder(userId);
        return order ? `Your last order total is Rs ${order.totalAmount}.` : "You haven’t placed any orders yet.";
      }

      if (action.action === "get_first_order") {
        const order: any = await getFirstOrder(userId);
        return order ? `Your first order total is Rs ${order.totalAmount}.` : "You haven’t placed any orders yet.";
      }

      return "I can help with collections, cart, and orders. Ask me about a product or collection and I’ll guide you.";
    } catch (err) {
      console.error("Direct intent safety fallback error:", err);
      return "I tried to process that, but something went wrong — please try again.";
    }
  }

  if (looksLikeSafetyRefusal(reply)) {
    return "I can help with collections, cart, and orders. Ask me about a product or collection and I’ll guide you.";
  }

  if (looksLikeJsonPayload(reply)) {
    const extractedAction = tryParseCartAction(reply);
    if (!extractedAction) {
      return "I can help with collections, cart, and orders. Ask me about a product or collection and I’ll guide you.";
    }

    const action = extractedAction;
    if (!user?._id) {
      return "You’ll need to be logged in for me to add that to your cart — want to log in first?";
    }

    try {
      const userId = user._id.toString();

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

      if (action.action === "update_cart") {
        const cart: any = await updateQuantity(
          userId,
          action.collectionTitle,
          action.quantity!
        );

        return `Updated "${action.collectionTitle}" to ${action.quantity} in your cart. Your cart total is now Rs ${cart.totalAmount}.`;
      }

      if (action.action === "remove_from_cart") {
        const cart: any = await removeFromCart(
          userId,
          action.collectionTitle
        );

        return `Removed "${action.collectionTitle}" from your cart. Your cart total is now Rs ${cart.totalAmount}.`;
      }

      if (action.action === "place_order") {
        const order = await createOrder(userId);
        return `Your order has been placed successfully. Your order ID is ${order._id}.`;
      }

      if (action.action === "get_orders") {
        const orders: any[] = await getUserOrders(userId);

        if (!orders.length) {
          return "You haven't placed any orders yet.";
        }

        const orderList = orders
          .map((order: any, index: number) => {
            const items =
              order.products
                ?.map(
                  (item: any) =>
                    `${item.collectionId?.title || item.collectionId?.name || "Unknown item"} (x${item.quantity})`
                )
                .join(", ") || "No items";

            return `${index + 1}. Order #${order._id} — ${items} — Rs ${order.totalAmount} — ${order.status}`;
          })
          .join("\n");

        return `You have placed ${orders.length} orders:\n\n${orderList}`;
      }

      if (action.action === "get_last_order") {
        const order: any = await getLastOrder(userId);

        if (!order) {
          return "You haven't placed any orders yet.";
        }

        const products = order.products
          ?.map((item: any) => {
            const collection = item.collectionId;
            return `${collection?.title || collection?.name || "Unknown item"} (x${item.quantity})`;
          })
          .join(", ");

        return `Your last order was placed on ${new Date(order.createdAt).toLocaleDateString()}.\n\nOrder ID: ${order._id}\n\nItems: ${products || "No items found"}\n\nSubtotal: Rs ${order.subTotal}\nDiscount: Rs ${order.discountAmount}\nTax: Rs ${order.taxAmount}\nTotal: Rs ${order.totalAmount}\n\nStatus: ${order.status}.`;
      }

      if (action.action === "get_first_order") {
        const order: any = await getFirstOrder(userId);

        if (!order) {
          return "You haven't placed any orders yet.";
        }

        const products = order.products
          ?.map((item: any) => {
            const collection = item.collectionId;
            return `${collection?.title || collection?.name || "Unknown item"} (x${item.quantity})`;
          })
          .join(", ");

        return `Your first order was placed on ${new Date(order.createdAt).toLocaleDateString()}.\n\nOrder ID: ${order._id}\n\nItems: ${products || "No items found"}\n\nSubtotal: Rs ${order.subTotal}\nDiscount: Rs ${order.discountAmount}\nTax: Rs ${order.taxAmount}\nTotal: Rs ${order.totalAmount}\n\nStatus: ${order.status}.`;
      }

      if (action.action === "get_order_summary") {
        const summary = await getOrderSummary(userId);
        return `You have placed ${summary.totalOrders} orders with a total spending of Rs ${summary.totalSpent}.`;
      }

      if (action.action === "find_order") {
        try {
          const orders: any[] = await findOrder(userId, {
            date: action.date,
            status: action.status,
            totalAmount: action.totalAmount,
            productCount: action.productCount,
          });

          const orderDetails = orders
            .map((order: any, index: number) => {
              const products = order.products
                ?.map((item: any) => {
                  const collection = item.collectionId;
                  return `${collection?.title || collection?.name || "Unknown item"} (x${item.quantity})`;
                })
                .join(", ");

              return `${index + 1}. Order ID: ${order._id}\nDate: ${new Date(order.createdAt).toLocaleDateString()}\nItems: ${products || "No items found"}\nSubtotal: Rs ${order.subTotal}\nDiscount: Rs ${order.discountAmount}\nTax: Rs ${order.taxAmount}\nTotal: Rs ${order.totalAmount}\nStatus: ${order.status}`;
            })
            .join("\n\n");

          return `I found ${orders.length} matching ${orders.length === 1 ? "order" : "orders"}:\n\n${orderDetails}`;
        } catch (error) {
          if (error instanceof OrderError) {
            return error.message;
          }
          console.error("Find orders error:", error);
          return "For now, I am not able to find those orders.";
        }
      }

      return "I can help with collections, cart, and orders. Ask me about a product or collection and I’ll guide you.";
    } catch (err) {
      if (err instanceof CollectionNotFoundError) {
        return err.message;
      }

      if (err instanceof OrderError) {
        return err.message;
      }

      console.error("Cart action error:", err);
      return "I tried to update your cart but something went wrong — please try again.";
    }
  }

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
      const orders: any[] = await getUserOrders(userId);

      if (!orders.length) {
        return "You haven't placed any orders yet.";
      }

      const orderList = orders
        .map((order: any, index: number) => {
          const items =
            order.products
              ?.map(
                (item: any) =>
                  `${item.collectionId?.title || item.collectionId?.name || "Unknown item"} (x${item.quantity})`
              )
              .join(", ") || "No items";

          return `${index + 1}. Order #${order._id} — ${items} — Rs ${order.totalAmount} — ${order.status}`;
        })
        .join("\n");

      return `You have placed ${orders.length} orders:\n\n${orderList}`;
    }

    if (action.action === "get_last_order") {
      const order: any = await getLastOrder(userId);

      if (!order) {
        return "You haven't placed any orders yet.";
      }

      const products = order.products
        ?.map((item: any) => {
          const collection = item.collectionId;

          return `${collection?.title || collection?.name || "Unknown item"} (x${item.quantity})`;
        })
        .join(", ");

      return `Your last order was placed on ${new Date(
        order.createdAt
      ).toLocaleDateString()}.

Order ID: ${order._id}

Items: ${products || "No items found"}

Subtotal: Rs ${order.subTotal}
Discount: Rs ${order.discountAmount}
Tax: Rs ${order.taxAmount}
Total: Rs ${order.totalAmount}

Status: ${order.status}.`;
    }

    if (action.action === "get_first_order") {
      const order: any = await getFirstOrder(userId);

      if (!order) {
        return "You haven't placed any orders yet.";
      }

      const products = order.products
        ?.map((item: any) => {
          const collection = item.collectionId;

          return `${collection?.title || collection?.name || "Unknown item"} (x${item.quantity})`;
        })
        .join(", ");

      return `Your first order was placed on ${new Date(
        order.createdAt
      ).toLocaleDateString()}.

Order ID: ${order._id}

Items: ${products || "No items found"}

Subtotal: Rs ${order.subTotal}
Discount: Rs ${order.discountAmount}
Tax: Rs ${order.taxAmount}
Total: Rs ${order.totalAmount}

Status: ${order.status}.`;
    }

    if (action.action === "get_order_summary") {
      const summary = await getOrderSummary(userId);

      return `You have placed ${summary.totalOrders} orders with a total spending of Rs ${summary.totalSpent}.`;
    }

    if (action.action === "find_order") {
      try {
        const orders: any[] = await findOrder(userId, {
          date: action.date,
          status: action.status,
          totalAmount: action.totalAmount,
          productCount: action.productCount,
        });

        const orderDetails = orders
          .map((order: any, index: number) => {
            const products = order.products
              ?.map((item: any) => {
                const collection = item.collectionId;

                return `${collection?.title || collection?.name || "Unknown item"} (x${item.quantity})`;
              })
              .join(", ");

            return `${index + 1}. Order ID: ${order._id}
Date: ${new Date(order.createdAt).toLocaleDateString()}
Items: ${products || "No items found"}
Subtotal: Rs ${order.subTotal}
Discount: Rs ${order.discountAmount}
Tax: Rs ${order.taxAmount}
Total: Rs ${order.totalAmount}
Status: ${order.status}`;
          })
          .join("\n\n");

        return `I found ${orders.length} matching ${orders.length === 1 ? "order" : "orders"
          }:

${orderDetails}`;
      } catch (error) {
        if (error instanceof OrderError) {
          return error.message;
        }
        console.error("Find orders error:", error);
        return "For now, I am not able to find those orders.";
      }
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