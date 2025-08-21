export const cookieOptions: any = {
  httpOnly: true,
  secure: ["customdev", "live"].includes(process.env.NODE_ENV as string),
  sameSite: "none", // if cross-domain
};