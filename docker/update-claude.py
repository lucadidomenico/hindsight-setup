"""Sostituisce il Claude Code incluso nell'SDK con l'ultima versione Linux ufficiale."""
import hashlib, json, os, platform, urllib.request
base = "https://downloads.claude.ai/claude-code-releases"
version = urllib.request.urlopen(f"{base}/latest").read().decode().strip()
arch = {"x86_64": "x64", "aarch64": "arm64"}[platform.machine()]
plat = f"linux-{arch}"
manifest = json.load(urllib.request.urlopen(f"{base}/{version}/manifest.json"))
data = urllib.request.urlopen(f"{base}/{version}/{plat}/claude").read()
assert hashlib.sha256(data).hexdigest() == manifest["platforms"][plat]["checksum"], "checksum errato"
import claude_agent_sdk
dest = os.path.join(os.path.dirname(claude_agent_sdk.__file__), "_bundled", "claude")
open(dest, "wb").write(data)
os.chmod(dest, 0o755)
print("Claude Code", version, plat, "installato in", dest)
