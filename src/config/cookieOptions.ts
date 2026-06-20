const NODE_ENV = process.env.NODE_ENV || "development"

const hour = 1

export const cookieOptions: any = {
  maxAge: hour * 60 * 60 * 1000,
  httpOnly: false,
  secure: NODE_ENV !== "development",
  sameSite: NODE_ENV !== "development" ? "none" : "lax",
  domain: NODE_ENV !== "development" ? ".vercel.app" : undefined,
  path: "/"
}