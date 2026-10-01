# hindsight-setup

Una skill per Claude Code che installa e configura da zero **[Hindsight](https://github.com/vectorize-io/hindsight)** sul tuo computer, Mac o Windows, come memoria condivisa tra **Claude Code** e **Codex**.

Tu lanci `/hindsight-setup` e Claude Code fa tutto il lavoro: controlla i prerequisiti, avvia il server, collega gli agenti, importa la tua memoria e alla fine verifica che funzioni. Si ferma solo quando serve davvero il tuo intervento, per esempio per creare il token del tuo abbonamento Claude.

## Cosa ottieni

- **Memoria automatica.** A fine sessione Hindsight salva le decisioni e le informazioni importanti; alla prima domanda della sessione successiva le passa all'agente.
- **Memoria condivisa.** Quello che Claude Code impara lo sa anche Codex, e viceversa.
- **Claude Opus 5.5 con il tuo abbonamento.** Il "cervello" di Hindsight è Opus 5.5, che gira sull'abbonamento Claude Code: niente chiavi API da pagare a parte.
- **Modelli multilingua.** I modelli locali per la ricerca capiscono l'italiano (quelli predefiniti capiscono soprattutto l'inglese).
- **Solo dove vuoi tu.** La memoria è attiva solo sui progetti che scegli.
- **Niente di più.** Hindsight sostituisce la memoria nativa di Claude Code e basta: niente analisi automatica del codice o della storia git.
- **Riparti dalla memoria che hai.** La memoria nativa di Claude Code dei tuoi progetti viene importata in Hindsight.

## Prerequisiti

- Un abbonamento Claude con **Claude Code** installato e con il login fatto.
- **Docker**: Docker Desktop (Mac e Windows) oppure OrbStack (Mac).
- **Node.js** 20 o successivo.
- Facoltativo: **Codex** (`npm install -g @openai/codex`), se vuoi condividere la memoria anche con lui.

Se manca qualcosa, la skill te lo dice e ti dà il comando per installarlo.

## Installazione della skill

**Mac** (Terminale):

```bash
git clone https://github.com/lucadidomenico/hindsight-setup ~/.claude/skills/hindsight-setup
```

**Windows** (PowerShell):

```powershell
git clone https://github.com/lucadidomenico/hindsight-setup $HOME\.claude\skills\hindsight-setup
```

## Uso

1. Apri Claude Code.
2. Scrivi `/model` e scegli **Opus 5.5**: la skill lo richiede e si ferma se usi un altro modello.
3. Scrivi `/hindsight-setup` e segui le indicazioni.

Ci vogliono circa 15–20 minuti, quasi tutti di download (l'immagine Docker e i modelli).

## Cosa fa, passo per passo

1. Ti chiede su quali progetti attivare la memoria, se collegare Codex e se importare la memoria nativa.
2. Controlla Docker, Node.js, Claude Code e Codex.
3. Ti guida a creare il token del tuo abbonamento con `claude setup-token`. Il token lo salvi tu in un file: non passa mai nella conversazione.
4. Crea l'immagine Docker di Hindsight con un Claude Code aggiornato: quello incluso nell'immagine ufficiale è troppo vecchio per Opus 5.5.
5. Avvia il server: API su `http://127.0.0.1:8888`, interfaccia web su `http://localhost:9999`.
6. Installa il plugin `@vectorize-io/hindsight-coding-agents` per Claude Code e Codex e lo configura.
7. Spegne la memoria nativa di Claude Code nei progetti scelti.
8. Prepara la memoria dei progetti.
9. Importa la memoria nativa di Claude Code.
10. **Fa le prove come le faresti tu**: in una sessione di Claude Code lascia una nota, in una sessione nuova chiede a Claude Code di ricordarla, poi chiede la stessa cosa a Codex. Se tutti e due rispondono giusto, la memoria funziona ed è condivisa.

## Cose da sapere

- **Tempo.** La prima risposta di ogni sessione arriva dopo circa 30–40 secondi, perché Opus 5.5 prepara il riassunto della memoria. Le domande successive non hanno questo ritardo.
- **Privacy.** Il database della memoria resta sul tuo computer, dentro Docker. Le conversazioni vengono mandate al large language model perché le elabori: con Opus 5.5 vanno ad Anthropic, dove vanno già quando usi Claude Code.
- **Consumi.** L'elaborazione della memoria consuma la quota del tuo abbonamento Claude.
- **Token.** Il token di `claude setup-token` dura circa un anno. Quando scade se ne crea uno nuovo e si ricrea il container: le istruzioni sono in `reference/problemi.md`, oppure chiedi a Claude Code di farlo per te.
- **Docker deve essere acceso.** Attiva l'avvio automatico di Docker Desktop (o OrbStack) al login, altrimenti dopo un riavvio la memoria non è disponibile.
- **Può sbagliare.** Hindsight usa un modello per interpretare le conversazioni: ogni tanto può salvare un fatto sbagliato. Puoi controllare e correggere la memoria dall'interfaccia web.

## File del repo

| File | A cosa serve |
|---|---|
| `SKILL.md` | Le istruzioni che Claude Code segue. |
| `docker/Dockerfile`, `docker/update-claude.py` | Immagine di Hindsight con l'ultima versione di Claude Code, scaricata dal sito ufficiale e verificata con il checksum. |
| `scripts/import-claude-memory.mjs` | Importa la memoria nativa di Claude Code in Hindsight. |
| `reference/problemi.md` | Problemi noti e soluzioni. |
| `reference/pulizia.md` | Come disinstallare tutto e ripartire da zero. |

## Licenza

MIT. Hindsight è un progetto di [vectorize-io](https://github.com/vectorize-io/hindsight), con la sua licenza.
