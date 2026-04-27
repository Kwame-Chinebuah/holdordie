# Hold or Die — by KwamKitt

A one-touch mobile game. Hold to charge, release to fly. Overcharge and you explode.

---

## Quick Start

```bash
npm install --legacy-peer-deps
npx expo start
```
Scan the QR code with Expo Go on your phone.

If QR doesn't work on WiFi:
```bash
npx expo start --tunnel
```

---

## IMPORTANT — Icons

Before running, add these placeholder images to the `assets/` folder
(just copy any PNG and rename it — you can replace with proper icons later):
- `assets/icon.png`
- `assets/adaptive-icon.png`
- `assets/splash-icon.png`
- `assets/favicon.png`

OR run this to skip the icon error while testing:
```bash
npx expo start --clear
```

---

## Project Structure

```
HoldOrDie/
├── App.js
├── app.json
├── package.json
├── assets/              ← icons go here
├── src/
│   ├── screens/
│   │   └── GameScreen.js
│   ├── components/
│   │   ├── AdBanner.js
│   │   └── KwamKittBadge.js
│   └── data/
│       └── theme.js
```

---

## Play Store Build

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile production
```

Upload the `.aab` to Google Play Console.
