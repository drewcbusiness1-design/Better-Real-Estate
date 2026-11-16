#!/usr/bin/env python3
"""Verify all declared source files without modifying the checkout."""
import hashlib,json,sys
from pathlib import Path
root=Path(sys.argv[1]).resolve()
manifest=json.loads((root/'DAILY-RELEASE-SHA256.json').read_text())
for name,expected in manifest.items():
    path=(root/name).resolve()
    if not path.is_relative_to(root) or not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest()!=expected:
        raise SystemExit('Release verification failed: '+name)
print('Verified '+str(len(manifest))+' declared release files.')
