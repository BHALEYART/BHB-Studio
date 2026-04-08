# 🍔 BHB Studio

**Big Head Billionaires — Character Customizer & Animator**
Desktop app for Mac (arm64 + x64) and Windows (x64).

---

## Quick Start (Dev)

```bash
# Clone
git clone https://github.com/BHALEYART/bhb-studio.git
cd bhb-studio

# Install
npm install

# Run
npm start
```

Requires **Node.js 18+** and internet (character assets load from the CDN).

---

## Releasing a New Build

### 1. Bump the version

```bash
# In package.json, update "version": "1.x.x"
# Then commit & tag:
git add package.json
git commit -m "chore: bump version to v1.x.x"
git tag v1.x.x
git push origin main --tags
```

GitHub Actions automatically:
1. Builds macOS DMG (arm64 + x64) on `macos-14`
2. Builds Windows NSIS installer + portable EXE on `windows-latest`
3. Creates a GitHub Release with all artifacts attached

### 2. Monitor the build

Go to **Actions → Build & Release** in the GitHub repo.

The draft release will appear under **Releases** once both jobs finish (~8–12 min).

### 3. Publish the release

Edit the draft release, review the notes, then click **Publish release**.

---

## Optional: Code Signing

Unsigned builds work fine but show OS warnings on first launch. To enable signing:

### macOS

Add these to **GitHub repo → Settings → Secrets → Actions**:

| Secret | Value |
|--------|-------|
| `APPLE_CERTIFICATE_BASE64` | `base64 -i YourCert.p12` output |
| `APPLE_CERTIFICATE_PASSWORD` | `.p12` export password |
| `APPLE_TEAM_ID` | 10-char Team ID from developer.apple.com |
| `APPLE_ID` | Your Apple Developer email |
| `APPLE_APP_PASSWORD` | App-specific password (appleid.apple.com) |

### Windows

| Secret | Value |
|--------|-------|
| `WIN_CSC_LINK` | `base64 -i YourCert.pfx` output |
| `WIN_CSC_KEY_PASSWORD` | `.pfx` password |

Without these secrets the workflow still runs and produces unsigned builds.

---

## Project Structure

```
bhb-studio/
├── main.js                 ← Electron main process
├── preload.js              ← IPC bridge (contextBridge)
├── package.json            ← electron-builder config
├── renderer/
│   ├── customizer/
│   │   └── index.html      ← Customizer (patched for desktop)
│   ├── animator/
│   │   └── index.html      ← Animator (patched for desktop)
│   └── assets/
│       ├── bhb.css         ← Shared design system
│       └── bhb.js          ← Shared utilities (Electron-aware)
└── build/
    ├── icon.icns           ← macOS icon (512×512 recommended)
    ├── icon.ico            ← Windows icon
    ├── icon.png            ← Linux / fallback (512×512)
    └── entitlements.mac.plist
```

---

## Desktop-Specific Behaviour

| Feature | Desktop |
|---------|---------|
| PNG export | Native Save dialog (Downloads by default) |
| Video export | Native Save dialog |
| External links | Open in system browser |
| Wallet connect | Shows notice — use web app for on-chain features |
| Character state | Persists in `userData/localStorage` between sessions |
| Audio recording | Microphone permission requested on first use |
| Character assets | Loaded from CDN (internet required) |

---

## Icons

Place your icons in `build/` **before** building:

- `build/icon.png`  — 512×512 source (used for Linux, also auto-converts)
- `build/icon.icns` — Mac (generate: `iconutil` from a 512×512 PNG, or use `electron-icon-builder`)
- `build/icon.ico`  — Windows (generate: online converter or ImageMagick)

```bash
# Quick .icns from a 512x512 PNG (macOS):
mkdir -p icon.iconset
sips -z 512 512 build/icon.png --out icon.iconset/icon_512x512.png
iconutil -c icns icon.iconset -o build/icon.icns
rm -rf icon.iconset

# Quick .ico from a PNG (cross-platform with ImageMagick):
magick build/icon.png -resize 256x256 build/icon.ico
```
