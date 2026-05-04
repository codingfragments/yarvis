#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""
Build daily-dashboard.zip — a Claude Skill bundle.

Usage:
    build_skill.py [output_dir]

Default output: ./dist/daily-dashboard.zip (relative to this script)

The zip contains a single top-level directory `daily-dashboard/`:
    daily-dashboard/
        SKILL.md              (renamed from daily-dashboard-SKILL.md)
        briefing_schema.md
        briefing_schema.json
        validate_briefing.py  (executable bit preserved)

`briefing_config.yaml` is intentionally NOT packaged — that's user-specific
data the user maintains in their own `{config}` directory.

Install / update:
  - Claude Code / Cowork:  unzip into ~/.claude/skills/  (creates daily-dashboard/)
                           Re-running this script + re-unzipping is idempotent.
  - Claude Desktop / claude.ai:  upload the zip via Customize > Skills > "+".

Verifies that SKILL.md frontmatter has name and version before zipping, and
runs the validator script's --help (sanity smoke test) so a packaged zip is
always one that at least loads.
"""
from __future__ import annotations

import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path


SKILL_NAME = "daily-dashboard"
HERE = Path(__file__).resolve().parent

# Source filename → bundle filename. Source filenames are the working names
# in the dev tree; bundle filenames are what the skill loader expects.
BUNDLE_FILES: dict[str, str] = {
    "daily-dashboard-SKILL.md": "SKILL.md",
    "briefing_schema.md":       "briefing_schema.md",
    "briefing_schema.json":     "briefing_schema.json",
    "validate_briefing.py":     "validate_briefing.py",
}

EXECUTABLES = {"validate_briefing.py"}


def read_frontmatter(path: Path) -> dict[str, str]:
    """Tiny YAML-ish frontmatter parser — enough for {key: value} between --- markers."""
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        return {}
    end = text.find("\n---\n", 4)
    if end == -1:
        return {}
    block = text[4:end]
    out: dict[str, str] = {}
    for line in block.splitlines():
        m = re.match(r"^([A-Za-z0-9_-]+):\s*(.*?)\s*$", line)
        if m:
            value = m.group(2)
            # Strip surrounding quotes if present
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
                value = value[1:-1]
            out[m.group(1)] = value
    return out


def main() -> None:
    out_dir = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else HERE / "dist"
    out_dir.mkdir(parents=True, exist_ok=True)
    zip_path = out_dir / f"{SKILL_NAME}.zip"

    # 1. Verify all source files exist
    missing = [src for src in BUNDLE_FILES if not (HERE / src).is_file()]
    if missing:
        print(f"ERROR: missing source files in {HERE}: {missing}", file=sys.stderr)
        sys.exit(1)

    # 2. Sanity-check SKILL.md frontmatter
    fm = read_frontmatter(HERE / "daily-dashboard-SKILL.md")
    if fm.get("name") != SKILL_NAME:
        print(f"ERROR: SKILL.md frontmatter `name` is {fm.get('name')!r}, expected {SKILL_NAME!r}", file=sys.stderr)
        sys.exit(1)
    if not fm.get("description"):
        print("ERROR: SKILL.md frontmatter is missing `description`", file=sys.stderr)
        sys.exit(1)
    version = fm.get("version", "0.0.0")
    print(f"Packaging {SKILL_NAME} v{version}")

    # 3. Stage the bundle in a temp dir, then zip it. Top-level inside the
    # zip is the skill directory name, so unzipping at ~/.claude/skills/
    # produces ~/.claude/skills/daily-dashboard/.
    with tempfile.TemporaryDirectory() as tmp:
        stage = Path(tmp) / SKILL_NAME
        stage.mkdir()
        for src, dst in BUNDLE_FILES.items():
            target = stage / dst
            shutil.copy2(HERE / src, target)
            if src in EXECUTABLES:
                target.chmod(0o755)

        if zip_path.exists():
            zip_path.unlink()

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for path in sorted(stage.rglob("*")):
                if path.is_file():
                    arc = path.relative_to(stage.parent)  # daily-dashboard/<file>
                    info = zipfile.ZipInfo.from_file(path, arc)
                    # Preserve unix permissions inside the zip
                    info.external_attr = (path.stat().st_mode & 0o777) << 16
                    info.compress_type = zipfile.ZIP_DEFLATED
                    with path.open("rb") as f:
                        zf.writestr(info, f.read())

    # 4. Report
    size = zip_path.stat().st_size
    print(f"\nBuilt {zip_path} ({size:,} bytes)")
    print("\nContents:")
    with zipfile.ZipFile(zip_path) as zf:
        for info in zf.infolist():
            mode = (info.external_attr >> 16) & 0o777
            print(f"  {oct(mode)[2:]:>4}  {info.file_size:>8}  {info.filename}")

    print(f"""
Install / update:
  Claude Code / Cowork:
      unzip -o {zip_path} -d ~/.claude/skills/
  Claude Desktop / claude.ai:
      upload {zip_path.name} via Customize > Skills > "+"
""")


if __name__ == "__main__":
    main()
