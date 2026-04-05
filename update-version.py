#!/usr/bin/env python3
"""
Version management script for MatrixSpy
Updates version number in all relevant files
"""

import sys
import re
from pathlib import Path


def update_version(new_version: str):
    """Update version number in all files"""
    
    project_root = Path(__file__).parent
    
    # File 1: extension/package.json
    package_json = project_root / "extension" / "package.json"
    if package_json.exists():
        content = package_json.read_text()
        content = re.sub(
            r'"version":\s*"[^"]+"',
            f'"version": "{new_version}"',
            content
        )
        package_json.write_text(content)
        print(f"✓ Updated {package_json}")
    
    # File 2: extension/src/providers/CustomEditorProvider.ts
    custom_editor = project_root / "extension" / "src" / "providers" / "CustomEditorProvider.ts"
    if custom_editor.exists():
        content = custom_editor.read_text()
        content = re.sub(
            r'<div class="version-number">[^<]+</div>',
            f'<div class="version-number">{new_version}</div>',
            content
        )
        custom_editor.write_text(content)
        print(f"✓ Updated {custom_editor}")
    
    # File 3: README.md (changelog)
    readme = project_root / "README.md"
    if readme.exists():
        content = readme.read_text()
        # Add new version entry at top of changelog
        from datetime import datetime
        date_str = datetime.now().strftime("%Y-%m-%d")
        changelog_entry = f"""### v{new_version} ({date_str})

- Version update

"""
        if "## Changelog" in content:
            content = content.replace(
                "## Changelog\n\n",
                f"## Changelog\n\n{changelog_entry}"
            )
            readme.write_text(content)
            print(f"✓ Updated {readme}")
            
            # Also update extension/README.md
            extension_readme = project_root / "extension" / "README.md"
            if extension_readme.exists():
                extension_readme.write_text(content)
                print(f"✓ Updated {extension_readme}")
    
    print(f"\n✅ Version updated to {new_version}")
    print("\nNext steps:")
    print("  1. cd extension")
    print("  2. npm run compile")
    print("  3. npm run package")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python update-version.py <new-version>")
        print("Example: python update-version.py 1.0.2")
        sys.exit(1)
    
    new_version = sys.argv[1]
    update_version(new_version)
