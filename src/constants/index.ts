// export const cookieOptions: any = {
//   httpOnly: true,
//   secure: ["customdev", "live", "development"].includes(process.env.NODE_ENV as string),
//   // secure: true,
//   sameSite: "none", // if cross-domain
// };


export const cookieOptions: any = {
  httpOnly: ["customdev", "live"].includes(process.env.NODE_ENV as string),
  secure: ["customdev", "live"].includes(process.env.NODE_ENV as string),
  sameSite: ["customdev", "live"].includes(process.env.NODE_ENV as string) ? "none" : "lax",
};