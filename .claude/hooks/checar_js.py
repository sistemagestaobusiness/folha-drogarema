#!/usr/bin/env python3
# Depois de editar uma tela .html ou um .js, confere a sintaxe do JavaScript com node --check.
import json, os, re, subprocess, sys, tempfile
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
f = str((d.get('tool_input') or {}).get('file_path') or '')
if not f.endswith(('.html', '.js')) or not os.path.isfile(f):
    sys.exit(0)
src = open(f, encoding='utf-8', errors='ignore').read()
if f.endswith('.html'):
    blocos = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', src, re.S | re.I)
    if not blocos:
        sys.exit(0)
    src = '\n;\n'.join(blocos)
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as t:
    t.write(src); tmp = t.name
try:
    r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True, timeout=30)
except Exception:
    sys.exit(0)
finally:
    try: os.unlink(tmp)
    except Exception: pass
if r.returncode != 0:
    print(f'Erro de sintaxe no JavaScript de {os.path.basename(f)}:\n' + (r.stderr or '').replace(tmp, os.path.basename(f))[-1500:], file=sys.stderr)
    sys.exit(2)
sys.exit(0)
