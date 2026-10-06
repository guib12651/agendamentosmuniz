import { createECDH } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";

// Run on your own computer. Never print the private key or write it into source.
const destination = resolve(homedir(), "muniz-vapid-secrets.txt");
try {
  const pair = createECDH("prime256v1");
  pair.generateKeys();
  const publicKey = pair.getPublicKey().toString("base64url");
  const privateKey = pair.getPrivateKey().toString("base64url");
  writeFileSync(destination, `VAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${privateKey}\n`, {
    flag: "wx", mode: 0o600,
  });
  console.info(`Chaves salvas em: ${destination}`);
  console.info(`Chave pública (pode compartilhar): ${publicKey}`);
  console.info("Não compartilhe o arquivo nem a chave privada. Guarde uma cópia segura.");
} catch {
  console.error("Não foi possível salvar as chaves. Confira a permissão da pasta pessoal e se muniz-vapid-secrets.txt já existe. Nenhum arquivo existente foi substituído.");
  process.exitCode = 1;
}