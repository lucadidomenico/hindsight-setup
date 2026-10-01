# Ripartire da zero

Da usare solo dopo che l'utente ha confermato. Il volume `hindsight-data` contiene tutta la memoria salvata: cancellarlo la elimina per sempre.

Prima chiedi all'utente di chiudere tutte le sessioni di Claude Code e Codex, tranne questa. Poi esegui i passi in ordine.

**0. Ferma i processi del plugin rimasti in background**

Mac:

```bash
pkill -f 'coding-agents/dis[t]'
```

Windows (Git Bash non ha `pkill`):

```bash
powershell -NoProfile -Command 'Get-CimInstance Win32_Process | Where-Object { $_.Name -eq "node.exe" -and $_.CommandLine -like "*coding-agents*dist*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }'
```

`dis[t]` non è un errore di battitura. Senza le parentesi, `pkill -f` troverebbe anche la shell che sta eseguendo il comando (la sua riga di comando contiene lo stesso testo) e la chiuderebbe. Se `pkill` non trova processi esce con codice 1: va bene.

**1–4. Plugin, server e file di configurazione**

```bash
# 1. Disinstallazione del plugin
npx -y @vectorize-io/hindsight-coding-agents uninstall all

# 2. Configurazione, log e backup del plugin
rm -rf ~/.hindsight
rm -rf "$(node -p 'require("os").tmpdir()')/hindsight-coding-agent"
find ~/.claude ~/.codex -maxdepth 1 -name '*.hindsight-backup' -delete 2>/dev/null

# 3. Server: container, memoria, immagine
docker rm -f hindsight
docker volume rm hindsight-data
docker rmi hindsight-opus

# 4. File di configurazione del server (il token lo ricrea l'utente al passo 3)
rm -f ~/hindsight/hindsight.env ~/hindsight/claude-token.env
```

**5. A mano, con i tuoi strumenti di modifica dei file**

- in `~/.codex/config.toml` togli la riga `hooks = true` sotto `[features]` (e la sezione, se resta vuota);
- in `<progetto>/.claude/settings.local.json` di ogni progetto togli la chiave `autoMemoryEnabled`, lasciando il resto.

La memoria nativa in `~/.claude/projects/*/memory` non viene toccata dall'installazione: resta lì.
