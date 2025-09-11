import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const { NODE_ENV } = process.env;
let credentials: {
  key?: string;
  cert?: string;
  ca?: string | Buffer<ArrayBufferLike>;
} = {};

try {
  if (NODE_ENV === "customdev") {
    const key = fs.readFileSync(
      "/etc/apache2/ssl/onlinetestingserver.key",
      "utf8",
    );
    const cert = fs.readFileSync(
      "/etc/apache2/ssl/onlinetestingserver.crt",
      "utf8",
    );
    const ca = fs.readFileSync("/etc/apache2/ssl/onlinetestingserver.ca");
    credentials = { key, cert, ca };
  } else if (NODE_ENV === "live") {
    const combinedFile = fs.readFileSync(
      "/var/cpanel/ssl/apache_tls/realmoneydragon.io/combined",
      "utf8",
    );
    const [key, cert, ca] = combinedFile.split(/\n(?=-----BEGIN)/);
    credentials = { key, cert, ca };
  }
} catch (error) {
  console.log("Error reading SSL files: ", error);
}

export default credentials;
