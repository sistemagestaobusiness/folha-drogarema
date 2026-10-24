#!/usr/bin/env python3
# Barra envio ao GitHub sem o OK do Alexandre (regra do projeto). Exit 2 = a ferramenta não roda.
import json, re, sys
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
cmd = str((d.get('tool_input') or {}).get('command') or '')
proibido = [r'\bgit\s+push\b', r'\bgit\s+merge\b', r'\bgit\s+branch\s+-[dD]\b', r'\bgh\s+pr\s+(create|merge)\b', r'\bgit\s+remote\s+(add|set-url)\b']
for p in proibido:
    if re.search(p, cmd):
        print('Bloqueado: envio ao GitHub só com o OK do Alexandre para esta entrega. Prepare o pacote (/entrega) e espere a autorização.', file=sys.stderr)
        sys.exit(2)
sys.exit(0)
