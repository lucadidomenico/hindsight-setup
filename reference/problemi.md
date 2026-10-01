# Problemi noti e soluzioni

## `401 invalid bearer token` nei log del server

Il token in `claude-token.env` è sbagliato o incompleto. Il caso più comune: è stato salvato il codice mostrato dal browser invece del token che `claude setup-token` stampa nel terminale dopo aver incollato quel codice. L'utente rifà il passo 3, poi ricrea il container (vedi sotto).

## `Claude Code X does not support this model` / `version X or newer is required`

Il Claude Code dentro l'immagine è troppo vecchio per il modello. Ricostruisci l'immagine scaricando l'ultima versione e ricrea il container:

```bash
docker build --no-cache -t hindsight-opus "SKILL_DIR/docker"
```

## Ricreare il container (dopo un nuovo token o una nuova immagine)

```bash
cd ~/hindsight
docker rm -f hindsight
docker run -d --name hindsight --restart unless-stopped \
  --env-file hindsight.env --env-file claude-token.env \
  -p 127.0.0.1:8888:8888 -p 127.0.0.1:9999:9999 \
  -v hindsight-data:/home/hindsight/.pg0 \
  hindsight-opus
```

La memoria sta nel volume `hindsight-data` e non si perde. Su Windows metti `MSYS_NO_PATHCONV=1` davanti a `docker run`.

## `curl: Empty reply from server` subito dopo l'avvio

Il server si sta ancora avviando. Aspetta e riprova.

## Banner "Hindsight is learning this repo" e niente riassunto alla prima domanda

La bank è considerata "fredda": senza import git lo è sempre, a meno che `autoSeed` sia `false` e la bank abbia le pagine di conoscenza. Controlla che le pagine siano 5 (passo 8) e che in `~/.hindsight/coding-agent.json` ci sia `"autoSeed": false`. Con la configurazione giusta il banner dice "Hindsight is tracking the decisions…".

## Pagine di conoscenza ferme a 0 (deepen bloccato)

Succede se una bank è stata cancellata mentre il plugin la stava preparando: il processo `deepen` resta appeso e tiene un lock, e i deepen successivi scrivono nel log `another run holds the lease … nothing to do`. Ferma il processo e cancella il lock:

Mac:

```bash
pkill -f 'coding-agents/dist/deepe[n]'
rm -rf "$(node -p 'require("os").tmpdir()')/hindsight-coding-agent"   # il lock lasciato dal processo fermato
```

Windows (Git Bash non ha `pkill`):

```bash
powershell -NoProfile -Command 'Get-CimInstance Win32_Process | Where-Object { $_.Name -eq "node.exe" -and $_.CommandLine -like "*coding-agents*dist*deepen*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }'
rm -rf "$(node -p 'require("os").tmpdir()')/hindsight-coding-agent"
```

Poi apri una nuova sessione nel progetto (con `autoSeed` non ancora a `false`) e ricontrolla le pagine.

## `Reflect timed out after 20000 ms` nel log del plugin

Manca `"reflectTimeoutMs": 120000` in `~/.hindsight/coding-agent.json`, oppure il timeout dell'hook `UserPromptSubmit` è rimasto a 30 (va a 150 in `~/.claude/settings.json` e `~/.codex/hooks.json`).

## Codex non usa la memoria

- In `~/.codex/config.toml`, sotto `[features]`, deve esserci `hooks = true`, e la sezione `[features]` deve essere una sola.
- Controlla il timeout 150 in `~/.codex/hooks.json`.

## Compare una bank per un progetto non scelto

`optInOnly` non è attivo o il percorso in `optInPaths` non corrisponde. Correggi `~/.hindsight/coding-agent.json`, poi cancella la bank in più. Prima ferma gli eventuali deepen in corso (vedi sopra), altrimenti restano bloccati:

```bash
B="coding-agent::<nome>"
curl -X DELETE "http://127.0.0.1:8888/v1/default/banks/$(node -p 'encodeURIComponent(process.argv[1])' "$B")"
```

## Hai cambiato i modelli di embedding

Cambiare il modello di embedding rende inutilizzabile la memoria esistente: le bank vanno cancellate e ricreate.
