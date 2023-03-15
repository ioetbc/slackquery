/* eslint-disable @typescript-eslint/no-non-null-assertion */
import crypto from "crypto";

interface EncryptedData {
  iv: string;
  encryptedData: string;
}

const algorithm = "aes-256-cbc";

export const encrypt = (text: string): EncryptedData => {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
  const iv = Buffer.from(process.env.ENCRYPTION_IV!, "hex");

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return {iv: iv.toString("hex"), encryptedData: encrypted.toString("hex")};
};

export const decrypt = (encryptedData: string): string => {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
  const iv = Buffer.from(process.env.ENCRYPTION_IV!, "hex");

  const encryptedBuffer = Buffer.from(encryptedData, "hex");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};
