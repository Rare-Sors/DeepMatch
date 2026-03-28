import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const jwk = publicKey.export({ format: "jwk" });
const privateKeyPem = privateKey.export({ format: "pem", type: "pkcs8" }).toString();
const kid = `deepmatch-signing-${Date.now()}`;

console.log(
  JSON.stringify(
    {
      kid,
      publicKeyB64: jwk.x,
      privateKeyPem,
    },
    null,
    2,
  ),
);
