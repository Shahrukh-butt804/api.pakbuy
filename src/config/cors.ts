const allowedOrigins = new Set([
  "customdev.solutions",
  "localhost",
]);

const headers = [
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "Accept",
  "VERSION",
];

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) =>
    !origin || [...allowedOrigins].some((domain) => origin.includes(domain))
      ? callback(null, true)
      : callback(new Error("Not allowed by CORS")),
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
  optionsSuccessStatus: 204,
  credentials: true,
  allowedHeaders: headers,
  exposedHeaders: headers,

};

export default corsOptions;
