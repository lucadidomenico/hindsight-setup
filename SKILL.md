---
name: hindsight-setup
description: Installa e configura da zero Hindsight (vectorize-io) come memoria condivisa tra Claude Code e Codex su Mac o Windows. Usa Claude Opus 5.5 con l'abbonamento Claude Code, modelli locali multilingua, memoria solo sui progetti scelti, importa la memoria nativa di Claude Code e verifica che la memoria funzioni e sia condivisa. Da usare quando l'utente chiede di installare, configurare o reinstallare Hindsight sul proprio computer.
---

# Installazione di Hindsight su Mac o Windows

Questa skill installa Hindsight come **sostituto della memoria nativa di Claude Code**, condiviso con Codex. Niente di più: niente analisi del codice, niente import della storia git.

Il risultato finale è questo:

- server Hindsight in un container Docker sul computer dell'utente: API su `http://127.0.0.1:8888`, interfaccia web su `http://localhost:9999`;
- large language model **Claude Opus 5.5 tramite l'abbonamento Claude Code** (token `claude setup-token`), senza chiavi API;
- modelli locali multilingua per embedding e reranking;
- plugin `@vectorize-io/hindsight-coding-agents` per Claude Code e Codex, attivo **solo** sui progetti scelti dall'utente;
- memoria nativa di Claude Code importata e poi spenta nei progetti scelti.

Lavora un passo alla volta, nell'ordine. Dopo ogni passo dì all'utente in una riga cosa hai fatto e cosa succede adesso: è possibile che stia registrando un video.

## Regole

- **Mai leggere, stampare o copiare il token di Claude.** Il file `claude-token.env` lo crea e lo modifica solo l'utente. Puoi controllarne l'esistenza e la prima parte del nome della variabile con `grep -c '^CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-' <file>` (stampa solo un numero), mai il valore.
- I comandi della skill funzionano in bash e in zsh (la shell predefinita del Mac). Su Windows Claude Code usa Git Bash, quindi funzionano anche lì (se hai solo PowerShell, traduci i comandi con lo stesso effetto). I comandi segnati "solo Windows" non vanno lanciati sul Mac. Su Windows metti `MSYS_NO_PATHCONV=1` davanti ai comandi `docker` che contengono percorsi che iniziano con `/` (per esempio `-v hindsight-data:/home/hindsight/.pg0`), altrimenti Git Bash li trasforma in percorsi Windows.
- I file JSON e TOML di configurazione li modifichi con i tuoi strumenti di lettura e modifica dei file, **conservando tutto il contenuto esistente**. Non sovrascriverli mai da zero.
- Quando serve un'azione dell'utente (installare un programma, creare il token, aprire un browser), fermati, spiega esattamente cosa deve fare e aspetta che ti dica "fatto".
- I test (passo 10) li fai tu, come li farebbe una persona: lanci i comandi, apri le sessioni di Claude Code e Codex, fai le domande e leggi le risposte. Non scrivere script di test.
- **Attese.** Claude Code blocca i comandi `sleep` lunghi o isolati: per aspettare usa sempre i cicli "ripeti finché" scritti qui sotto, con un timeout del comando Bash adeguato (5–10 minuti).
- **JSON dalla riga di comando.** Leggilo con `node` (c'è sempre, serve per il plugin), non con `python3`: su Windows Python spesso non c'è.
- `SKILL_DIR` è la cartella di questa skill: Claude Code te la mostra quando carica la skill ("Base directory for this skill").

## Passo 0 — Modello della sessione

Controlla con quale modello sta girando questa sessione (lo dice il tuo prompt di sistema). Se **non** è Claude Opus 5.5, **fermati subito** e scrivi all'utente:

> Per questa installazione serve Claude Opus 5.5 nella sessione di Claude Code. Scrivi `/model`, scegli Opus 5.5 e poi rilancia `/hindsight-setup`.

Non fare nient'altro finché il modello non è Opus 5.5.

## Passo 1 — Domande iniziali

Rileva il sistema operativo con `uname -s` (`Darwin` = Mac, `MINGW*`/`MSYS*` = Windows). Poi fai all'utente queste domande, tutte insieme:

1. **Su quali progetti attivare Hindsight?** Percorsi completi delle cartelle. Su Windows ti servono nel formato Windows (`C:\Users\...`): se l'utente ti dà un percorso Git Bash, convertilo con `cygpath -w`.
2. **Vuoi collegare anche Codex?** Sì/no.
3. **Vuoi importare la memoria nativa di Claude Code** di questi progetti? Sì/no (consigliato sì).

Il modello del server è sempre `claude-opus-5-5`.

## Passo 2 — Prerequisiti

Controlla, uno per uno, e riporta una tabella con cosa c'è e cosa manca:

```bash
docker --version && docker info --format '{{.ServerVersion}}'
node --version        # serve 20 o superiore
npx --version
claude --version
codex --version       # solo se l'utente vuole Codex
curl --version | head -1
```

Se manca qualcosa, dai all'utente il comando giusto per il suo sistema e aspetta che ti dica "fatto":

| Cosa | Mac | Windows |
|---|---|---|
| Docker | Docker Desktop (docker.com) oppure `brew install --cask orbstack` | `winget install Docker.DockerDesktop`, poi riavvio; Docker Desktop chiede di attivare WSL 2 se manca |
| Node.js | `brew install node` | `winget install OpenJS.NodeJS.LTS` |
| Codex | `npm install -g @openai/codex` e poi `codex` per fare il login | uguale |

Se `docker info` fallisce ma `docker --version` funziona, Docker è installato ma spento: chiedi all'utente di aprire Docker Desktop (o OrbStack) e aspettare che sia avviato.

Controlla anche se c'è già un'installazione precedente:

```bash
docker ps -a --filter 'name=^hindsight$' --format '{{.Names}} {{.Status}}'
docker volume ls --filter 'name=^hindsight-data$' --format '{{.Name}}'
ls ~/.hindsight/coding-agent.json 2>/dev/null
```

Se trovi qualcosa, **fermati** e chiedi all'utente se vuole ripartire da zero. Se dice sì, prima di cancellare il volume ricordagli che contiene tutta la memoria salvata. Poi ripulisci con i comandi di `reference/pulizia.md`.

## Passo 3 — Token dell'abbonamento Claude

Il server dentro Docker non vede il login di Claude Code del computer: serve un token dedicato. Crea la cartella e spiega all'utente cosa fare:

```bash
mkdir -p ~/hindsight
```

Istruzioni da dare all'utente (in un **terminale separato**, non in questa sessione, perché il token non deve finire nella conversazione):

1. Lancia `claude setup-token`.
2. Si apre il browser: autorizza. Il browser mostra un **codice**: quello NON è il token. Copialo e incollalo nel terminale dove gira `claude setup-token`.
3. Il terminale stampa il token vero, che inizia con `sk-ant-oat01-` e dura circa un anno.
4. Apri il file con `nano ~/hindsight/claude-token.env` (su Windows: `notepad $HOME\hindsight\claude-token.env` in PowerShell) e scrivi una sola riga:
   `CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...` (il token intero, senza spazi né virgolette). Salva.

Quando l'utente dice "fatto", **solo su Windows** togli prima i caratteri invisibili che Notepad può aggiungere (fine riga Windows e, nelle versioni vecchie, il BOM a inizio file). Docker li considererebbe parte del token e il server risponderebbe `401`:

```bash
sed -i '1s/^\xEF\xBB\xBF//;s/\r$//' ~/hindsight/claude-token.env
```

Poi, su tutti i sistemi, controlla senza stampare il token:

```bash
grep -c '^CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-' ~/hindsight/claude-token.env
```

Deve stampare `1`. Se stampa `0`, di solito l'utente ha salvato il codice del browser invece del token: rispiega il punto 2.

Su Mac proteggi il file, senza leggerlo: `chmod 600 ~/hindsight/claude-token.env`.

## Passo 4 — Configurazione del server

Crea `~/hindsight/hindsight.env` con questo contenuto (se esiste già, l'utente ha scelto di ripartire da zero: sostituiscilo):

```
HINDSIGHT_API_LLM_PROVIDER=claude-code
HINDSIGHT_API_LLM_MODEL=claude-opus-5-5
HINDSIGHT_API_WORKER_ID=hindsight
HINDSIGHT_API_EMBEDDINGS_PROVIDER=onnx
HINDSIGHT_API_EMBEDDINGS_ONNX_MODEL_ID=intfloat/multilingual-e5-small
HINDSIGHT_API_EMBEDDINGS_ONNX_DIMENSIONS=384
HINDSIGHT_API_RERANKER_PROVIDER=local
HINDSIGHT_API_RERANKER_LOCAL_MODEL=cross-encoder/mmarco-mMiniLMv2-L12-H384-v1
```

Spiega all'utente in breve:

- `claude-code` + `claude-opus-5-5`: il server usa Opus 5.5 tramite il suo abbonamento, non una chiave API.
- `WORKER_ID` fisso: senza, quando il container viene ricreato, le elaborazioni lasciate a metà restano bloccate.
- Le ultime cinque righe: modelli locali multilingua, perché quelli predefiniti capiscono soprattutto l'inglese.

Solo Windows: dopo averlo creato, esegui `sed -i 's/\r$//' ~/hindsight/hindsight.env` per essere sicuro che abbia fine riga Unix.

## Passo 5 — Immagine e avvio del server

L'immagine ufficiale contiene una versione di Claude Code troppo vecchia per Opus 5.5. Il `Dockerfile` in `SKILL_DIR/docker` crea un'immagine uguale all'ufficiale ma con l'ultima versione di Claude Code (scaricata dal sito ufficiale e verificata con il checksum).

```bash
docker build -t hindsight-opus "SKILL_DIR/docker"
```

Il primo build scarica l'immagine base (alcuni GB): può volerci qualche minuto. Poi avvia il container (su Windows con `MSYS_NO_PATHCONV=1` davanti a `docker run`):

```bash
cd ~/hindsight
docker run -d --name hindsight --restart unless-stopped \
  --env-file hindsight.env --env-file claude-token.env \
  -p 127.0.0.1:8888:8888 -p 127.0.0.1:9999:9999 \
  -v hindsight-data:/home/hindsight/.pg0 \
  hindsight-opus
```

Aspetta che il server risponda e che abbia caricato i modelli e verificato Opus 5.5 (al primo avvio scarica i modelli: fino a 5 minuti):

```bash
for i in $(seq 1 100); do
  L=$(docker logs hindsight 2>&1)
  printf '%s\n' "$L" | grep -q "Reranker:.*initialized" && printf '%s\n' "$L" | grep -qE "Claude Code connection" && break
  sleep 3
done
curl -sf -o /dev/null http://127.0.0.1:8888/health && echo "server pronto"
docker logs hindsight 2>&1 | grep -E "LLM:|Embeddings:.*initialized|Reranker:.*initialized|Claude Code connection"
```

Devono esserci: `provider=claude-code, model=claude-opus-5-5`, gli embedding ONNX inizializzati, il reranker inizializzato e `Claude Code connection verified successfully`. Se vedi errori, consulta `reference/problemi.md`.

Dì all'utente che l'interfaccia web è su http://localhost:9999 e ricordagli di attivare in Docker Desktop (o OrbStack) l'avvio automatico al login, altrimenti dopo un riavvio del computer il server è spento.

## Passo 6 — Plugin per Claude Code e Codex

```bash
npx -y @vectorize-io/hindsight-coding-agents install claude-code codex --server self-hosted --api-url http://127.0.0.1:8888
```

(Senza Codex: togli `codex` dal comando.)

Poi sistema questi file, **conservando tutto il resto del contenuto**:

1. **`~/.hindsight/coding-agent.json`**: lascia le chiavi che ci sono e imposta:
   ```json
   {
     "serverMode": "self-hosted",
     "apiUrl": "http://127.0.0.1:8888",
     "gitIngest": "none",
     "codebaseSurvey": false,
     "optInOnly": true,
     "optInPaths": ["<percorso progetto 1>", "<percorso progetto 2>"],
     "reflectTimeoutMs": 120000
   }
   ```
   Non aggiungere ancora `autoSeed`: serve attivo per la prima sessione (passo 8).
   Spiega all'utente: `gitIngest` e `codebaseSurvey` spengono l'analisi del codice e della storia git; `optInOnly` + `optInPaths` limitano la memoria ai progetti scelti (senza, Hindsight crea una memoria per ogni repo git che apri); `reflectTimeoutMs` dà a Opus 5.5 il tempo di preparare il riassunto della memoria a inizio sessione (il default di 20 secondi non basta).
   Su Windows i percorsi vanno in formato Windows con le barre raddoppiate: `"C:\\Users\\nome\\progetto"`. Il plugin li confronta distinguendo maiuscole e minuscole, lettera del disco compresa: ricavali con la grafia reale del disco: `cd "<progetto>" && node -p 'require("fs").realpathSync.native(".")'` (su Mac vale lo stesso, perché anche il disco del Mac di solito non distingue maiuscole e minuscole), e copiali esattamente.

2. **`~/.claude/settings.json`**: nell'hook `UserPromptSubmit` il cui comando contiene `claude-hook.js`, porta `timeout` da 30 a **150**.

3. Solo con Codex, **`~/.codex/hooks.json`**: nell'hook `UserPromptSubmit` il cui comando contiene `codex-hook.js`, porta `timeout` a **150**.

4. Solo con Codex, **`~/.codex/config.toml`**: sotto la sezione `[features]` deve esserci `hooks = true`. Se la sezione non esiste creala; se esiste aggiungi solo la riga (non creare una seconda sezione `[features]`, Codex non parte).

Il timeout a 150 secondi serve perché alla prima domanda di ogni sessione Opus 5.5 impiega 30–40 secondi a preparare il riassunto della memoria, e con 30 secondi l'hook verrebbe interrotto.

## Passo 7 — Memoria nativa spenta nei progetti

Per ogni progetto scelto, nel file `<progetto>/.claude/settings.local.json` imposta `"autoMemoryEnabled": false`, conservando le altre chiavi (se il file non esiste crealo con solo questa chiave). Così Claude Code non tiene due memorie in parallelo.

`settings.local.json` è personale e di norma ignorato da git: controlla con `git -C <progetto> check-ignore .claude/settings.local.json` e, se non è ignorato, dillo all'utente.

## Passo 8 — Prima sessione e pagine di conoscenza

Alla prima sessione in un progetto il plugin prepara la memoria in background: applica la configurazione e crea 5 pagine di conoscenza (knowledge pages). Finché le pagine non ci sono, il riassunto della memoria alla prima domanda viene saltato. Per questo `autoSeed` va lasciato attivo fino a questo momento e spento subito dopo.

Per ogni progetto, apri una prima sessione **come farebbe l'utente**: lancia Claude Code nella cartella del progetto con una domanda qualsiasi. Dentro questa sessione la variabile `CLAUDECODE` blocca le sessioni annidate, quindi toglila:

```bash
cd "<progetto>" && env -u CLAUDECODE claude -p "Ciao, rispondi solo ok" </dev/null
```

Poi trova il nome della bank (è `coding-agent::<nome della cartella del repo>`):

```bash
curl -s http://127.0.0.1:8888/v1/default/banks | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).banks.map(b=>b.bank_id).join("\n")))'
```

Se la bank del progetto **non** compare, il percorso in `optInPaths` non corrisponde a quello che vede il plugin. Di solito è una maiuscola diversa (su Windows anche la lettera del disco). Correggi il percorso, eventualmente aggiungendo anche la variante con la grafia diversa (per esempio sia `C:` sia `c:`), e rilancia la sessione.

Aspetta che le pagine siano 5 (di solito pochi secondi, al massimo qualche minuto):

```bash
B="coding-agent::<nome>"
E=$(node -p 'encodeURIComponent(process.argv[1])' "$B")   # il nome della bank può contenere spazi o accenti
for i in $(seq 1 60); do
  n=$(curl -s "http://127.0.0.1:8888/v1/default/banks/$E/mental-models" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log((j.items||j.mental_models||[]).length)}catch{console.log(0)}})')
  [ "$n" -ge 5 ] && break
  sleep 5
done
echo "pagine: $n"
grep "applied to $B" ~/.hindsight/coding-agents-logs/plugin.log | tail -1
```

Le pagine devono essere 5 e la riga `applied to` deve avere l'orario di adesso (in UTC). Se dopo 5 minuti sono ancora 0, consulta `reference/problemi.md` (deepen bloccato). In questa prima sessione è normale che il riassunto della memoria venga saltato: la bank è nuova.

Quando tutti i progetti hanno le 5 pagine, aggiungi `"autoSeed": false` a `~/.hindsight/coding-agent.json`.

## Passo 9 — Import della memoria nativa (se richiesto)

La memoria nativa di un progetto sta in `~/.claude/projects/<cartella>/memory`, dove `<cartella>` è il percorso del progetto con i separatori e i caratteri speciali sostituiti da `-` (es. `/Users/luca/mio.sito` → `-Users-luca-mio-sito`; su Windows qualcosa come `C--Users-luca-sito`). Non ricostruire il nome a mano: elenca `ls ~/.claude/projects/`, prendi la cartella che finisce con il nome del progetto e controlla che dentro ci sia `memory`. Mostra all'utente i file con `ls` e, se ci sono file `.md`, importali:

```bash
node "SKILL_DIR/scripts/import-claude-memory.mjs" ~/.claude/projects/<cartella>/memory "coding-agent::<nome>"
```

Se la cartella non esiste o è vuota, dillo e vai avanti.

## Passo 10 — Verifica, come la farebbe l'utente

Fai questi test su **un** progetto scelto. Usa una nota di prova innocua, che non cambi il lavoro sul progetto.

**a) Sessione 1 — scrivere una nota.**

```bash
cd "<progetto>" && env -u CLAUDECODE claude -p "Nota per il futuro: il nome in codice del test di installazione di Hindsight è girasole-42. Non è una regola del progetto, serve solo a verificare la memoria. Non modificare niente, rispondi solo ok." </dev/null
```

**b) Aspettare che Hindsight elabori.** A fine sessione la conversazione viene mandata a Hindsight, che con Opus 5.5 estrae i fatti e li consolida. Aspetta che non ci sia più niente in coda (di solito 1–3 minuti):

```bash
B="coding-agent::<nome>"
E=$(node -p 'encodeURIComponent(process.argv[1])' "$B")
for i in $(seq 1 80); do
  p=$(curl -s "http://127.0.0.1:8888/v1/default/banks/$E/stats" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.pending_operations+" "+j.pending_consolidation)}catch{console.log("?")}})')
  [ "$p" = "0 0" ] && break
  sleep 5
done
echo "in coda / da consolidare: $p"
```

Deve finire con `0 0`. Mostra all'utente anche l'URL della bank nell'interfaccia web, http://localhost:9999, dove ora si vedono i fatti estratti.

**c) Sessione 2 di Claude Code — rileggere la nota.** Nuova sessione, prima domanda (ci mette 30–40 secondi perché Opus 5.5 prepara il riassunto della memoria; usa un timeout del comando di almeno 5 minuti):

```bash
cd "<progetto>" && env -u CLAUDECODE claude -p "Qual è il nome in codice del test di installazione di Hindsight? Dimmi da dove lo sai." </dev/null
```

Deve rispondere `girasole-42` citando Hindsight o la memoria. Riporta all'utente la risposta testuale e il tempo impiegato.

Per conferma, controlla che alla prima domanda l'hook abbia preparato il riassunto (evento `reflect_ok`):

```bash
grep reflect ~/.hindsight/coding-agents-logs/diag.jsonl | tail -2
```

Se vedi `reflect_deferred` o un timeout, consulta `reference/problemi.md`.

**d) Codex — la memoria è condivisa?** (solo se l'utente ha scelto Codex):

```bash
cd "<progetto>" && codex exec "Qual è il nome in codice del test di installazione di Hindsight? Dimmi da dove lo sai." </dev/null
```

Deve rispondere anche lui `girasole-42`: la nota l'ha scritta Claude Code, quindi la memoria è condivisa. Nota: in `codex exec` gli hook di Codex non partono, quindi Codex legge la memoria con gli strumenti MCP di Hindsight (nell'output compaiono righe `mcp: hindsight/...`). È normale.

Poi chiedi all'utente di fare la prova anche in modalità interattiva, che è quella che userà davvero: aprire `codex` nella cartella del progetto, fare la stessa domanda e dirti la risposta. In modalità interattiva gli hook partono e la memoria arriva da sola alla prima domanda.

Se un test fallisce, guarda i log prima di riprovare:

```bash
grep -iE "reflect|timeout|lease|pending|error" ~/.hindsight/coding-agents-logs/plugin.log | tail -20
```

e consulta `reference/problemi.md`.

## Passo 11 — Riepilogo

Chiudi con un riepilogo breve:

- cosa è installato e dove (`~/hindsight`, container `hindsight`, volume `hindsight-data`, `~/.hindsight`);
- interfaccia web: http://localhost:9999 (la nota `girasole-42` si può cancellare da lì, oppure lasciarla: è innocua);
- su quali progetti è attivo e come aggiungerne un altro (aggiungerlo a `optInPaths`, rimettere temporaneamente `"autoSeed": true`, aprire una prima sessione e aspettare le 5 pagine, poi `"autoSeed": false` e spegnere la memoria nativa nel progetto);
- cose da sapere: la prima risposta di ogni sessione arriva dopo 30–40 secondi; il consumo va sull'abbonamento Claude; le conversazioni vengono mandate ad Anthropic per l'elaborazione, il database resta sul computer; il token scade dopo circa un anno (si rifà il passo 3 e si ricrea il container, vedi `reference/problemi.md`).
