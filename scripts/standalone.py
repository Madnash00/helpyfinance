"""Build Helpy Finance offline or recover the original v1.7 private inputs."""

import argparse
import base64
import hashlib
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASELINE_SHA = "ac5046c2650b19554bd46edc7b24e66740c40151dec302037ac18d5fc39dc25e"
DEMO = {
    "BALANCE_DATE": "2026-01-01",
    "BALANCE": "0",
    "FOOTER": "Helpy Finance | Dati dimostrativi",
    "PROJECT_A": "Progetto A",
    "PROJECT_B": "Progetto B",
}
BASELINE_FIELDS = {
    "WORKBOOK": r'window\.__HF_WORKBOOK_BASE64__="([A-Za-z0-9+/=]+)"',
    "LOGO": r"const HF_LOGO_B64='([A-Za-z0-9+/=]+)'",
    "BALANCE_DATE": r'var qM = "([0-9-]+)"',
    "BALANCE": r"sM = (-?[\d.]+);",
    "FOOTER": r"this\.text\('(Helpy Group Srl \| [^']+)',34,21,8,",
    "PROJECT_A": r'"(Equine [A-Za-z]+)",',
    "PROJECT_B": r'"(Unique [A-Za-z]+ [A-Za-z]+)",',
}


def check_output(path):
    """Require generated files inside ignored output folders or outside this checkout."""
    resolved = path.resolve()
    if resolved.is_relative_to(ROOT):
        relative = resolved.relative_to(ROOT)
        if relative.parts[0] not in {"data", "dist", "private"}:
            raise ValueError("Usa data/, dist/, private/ o un percorso fuori dalla repository.")
    return resolved


def write_new(path, payload):
    path = check_output(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "wb") as output:
        output.write(payload)


def extract(baseline, directory):
    source = baseline.read_bytes()
    if hashlib.sha256(source).hexdigest() != BASELINE_SHA:
        raise ValueError("L'HTML fornito non corrisponde alla baseline v1.7 verificata.")
    original = source.decode("utf-8")
    fields = {}
    for key, pattern in BASELINE_FIELDS.items():
        matches = re.findall(pattern, original)
        if len(matches) != 1:
            raise ValueError(f"Campo v1.7 non riconosciuto: {key}")
        fields[key] = matches[0]
    workbook = base64.b64decode(fields.pop("WORKBOOK"), validate=True)
    directory = check_output(directory)
    directory.mkdir(parents=True, exist_ok=False, mode=0o700)
    write_new(directory / "Helpy_PL.xlsx", workbook)
    write_new(directory / "profile.json", json.dumps(fields, ensure_ascii=False, indent=2).encode("utf-8"))


def js_text(value):
    return (
        json.dumps(value, ensure_ascii=False)[1:-1]
        .replace("<", r"\u003c")
        .replace("\u2028", r"\u2028")
        .replace("\u2029", r"\u2029")
    )


def build(output, directory):
    if directory is None:
        values = dict(DEMO)
        values["LOGO"] = (ROOT / "examples/demo-logo.jpg.b64").read_text().strip()
        workbook = (ROOT / "examples/demo.xlsx.b64").read_text().strip()
    else:
        values = json.loads((directory / "profile.json").read_text(encoding="utf-8"))
        if set(values) != set(DEMO) | {"LOGO"} or not all(isinstance(v, str) for v in values.values()):
            raise ValueError("Profilo privato incompleto.")
        workbook = base64.b64encode((directory / "Helpy_PL.xlsx").read_bytes()).decode("ascii")
    if not re.fullmatch(r"-?\d+(?:\.\d+)?", values["BALANCE"]):
        raise ValueError("Saldo di riferimento non valido.")
    if not re.fullmatch(r"\d{4}-\d\d-\d\d", values["BALANCE_DATE"]):
        raise ValueError("Data del saldo di riferimento non valida.")
    if not base64.b64decode(values["LOGO"], validate=True).startswith(b"\xff\xd8"):
        raise ValueError("Il logo deve essere un JPEG in Base64.")
    # The report uses a single-quoted literal, the dashboard double-quoted literals.
    for key in ("FOOTER", "PROJECT_A", "PROJECT_B"):
        values[key] = js_text(values[key])
    values["FOOTER"] = values["FOOTER"].replace("'", r"\'")
    values["WORKBOOK"] = workbook

    def render(name):
        template = (ROOT / "src" / name).read_text(encoding="utf-8")
        return re.sub(r"@@([A-Z_]+)@@", lambda match: values[match[1]], template)

    values["REPORT_SCRIPT"] = render("report.js")
    values["DASHBOARD_SCRIPT"] = render("dashboard.js")
    write_new(output, render("index.html").encode("utf-8"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    subcommands = parser.add_subparsers(dest="command", required=True)
    extract_parser = subcommands.add_parser("extract")
    extract_parser.add_argument("baseline", type=Path)
    extract_parser.add_argument("directory", type=Path)
    build_parser = subcommands.add_parser("build")
    build_parser.add_argument("output", type=Path)
    build_parser.add_argument("--private", type=Path)
    arguments = parser.parse_args()
    try:
        if arguments.command == "extract":
            extract(arguments.baseline, arguments.directory)
        else:
            build(arguments.output, arguments.private)
    except (OSError, ValueError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
