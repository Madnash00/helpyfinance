"""Check the Git index for private file types and embedded data."""

import re
import subprocess
from pathlib import PurePosixPath

ignored_directories = {"data", "dist", "private", "backups", "exports"}
private_extensions = {".xlsx", ".xls", ".xlsb", ".xlsm", ".csv", ".pdf", ".zip", ".json", ".env", ".pem", ".key"}
example_assets = {"examples/demo-logo.jpg.b64", "examples/demo.xlsx.b64"}

tracked = subprocess.check_output(["git", "ls-files", "-z"]).decode().split("\0")
for filename in filter(None, tracked):
    path = PurePosixPath(filename)
    if (
        path.parts[0] in ignored_directories
        or path.suffix.lower() in private_extensions
        or path.name.startswith((".env.", "Helpy-Finance-v"))
        or (path.suffix == ".b64" and filename not in example_assets)
    ):
        raise SystemExit(f"File riservato nell'indice Git: {filename}")
    data = subprocess.check_output(["git", "show", f":{filename}"])
    if filename not in example_assets and re.search(rb"[A-Za-z0-9+/]{8000,}={0,2}", data):
        raise SystemExit(f"Asset incorporato da verificare: {filename}")
    if re.search(rb"(?i)\bIT\d{2}[A-Z]\d{10}[A-Z0-9]{12}\b", data):
        raise SystemExit(f"IBAN da verificare: {filename}")

print("Indice Git verificato. Controlla anche il diff per i dati leggibili.")
