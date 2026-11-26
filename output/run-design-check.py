from pathlib import Path
import subprocess,sys
code=Path(sys.argv[1]).read_text()
r=subprocess.run(['/Users/apple/.codex/skills/playwright/scripts/playwright_cli.sh','-s=mingya-design','run-code',code],capture_output=True,text=True)
print(r.stdout.split('### Ran Playwright code')[0]);print(r.stderr)
