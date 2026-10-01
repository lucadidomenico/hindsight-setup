#!/usr/bin/env node
// Importa la memoria nativa di Claude Code (i file .md di ~/.claude/projects/<progetto>/memory)
// nella bank Hindsight del progetto.
//
// Uso:  node import-claude-memory.mjs <cartella-memory> <bank>
//       es. node import-claude-memory.mjs ~/.claude/projects/-Users-me-mioprogetto/memory coding-agent::mioprogetto
//
// Variabili opzionali: HINDSIGHT_URL (default http://127.0.0.1:8888) e HINDSIGHT_TOKEN
// (solo se il server richiede un token). Serve Node 18 o successivo.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const [folder, bank] = process.argv.slice(2);
if (!folder || !bank) {
  console.error("Uso: node import-claude-memory.mjs <cartella-memory> <bank>");
  process.exit(1);
}
const url = process.env.HINDSIGHT_URL ?? "http://127.0.0.1:8888";
const token = process.env.HINDSIGHT_TOKEN;

const context =
  "Appunto della memoria nativa di Claude Code per questo progetto, scritto dall'agente in sessioni " +
  "passate per ricordare decisioni, stato del lavoro, procedure e preferenze dell'utente. " +
  "Le date nel testo indicano quando i fatti erano veri.";

const items = readdirSync(folder)
  .filter((name) => name.endsWith(".md"))
  // MEMORY.md è solo l'indice; i file ._* sono metadati macOS.
  .filter((name) => name !== "MEMORY.md" && !name.startsWith("._"))
  .sort()
  .map((name) => ({
    content: readFileSync(join(folder, name), "utf8"),
    document_id: `claude-native-memory:${name.slice(0, -3)}`,
    context,
    tags: ["source:claude-native-memory", "harness:claude-code"],
    metadata: { source: "claude-native-memory", file: name },
  }));
if (!items.length) {
  console.error(`Nessun file .md trovato in ${folder}`);
  process.exit(1);
}

const res = await fetch(`${url}/v1/default/banks/${encodeURIComponent(bank)}/memories`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify({ items, async: true }),
});
if (!res.ok) {
  console.error(`Errore ${res.status}: ${await res.text()}`);
  process.exit(1);
}
console.log(`${items.length} appunti inviati alla bank ${bank}: Hindsight li elabora in background.`);
