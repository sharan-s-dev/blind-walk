# Contributing to BlindWalk 🌿

Welcome to **BlindWalk**! Thank you for taking the time to contribute. BlindWalk is an open-source, air-gapped spatial navigation engine and sensory audio navigator built for Hacktoberfest.

Whether you're fixing a bug, adding new campus grids, improving accessibility for low-vision users, or polishing the offline audio algorithms, your help is welcome!

---

## 🏷️ Hacktoberfest Quickstart

1. **Fork** this repository to your GitHub account.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/sharan-s-dev/blind-walk.git
   cd blind-walk
   ```
3. Run the test suite to ensure everything is working:
   ```bash
   npm test
   # Or: python -m unittest discover tests -v
   ```
4. Start the interactive web dashboard:
   ```bash
   npm start
   # Open http://localhost:8000
   ```

---

## 🎯 Good First Issues (Hacktoberfest Ideas)

Here are high-impact areas where contributions are actively desired:

### 1. Additional University & Park Topographies
Currently, the default pre-cached map is **Jain Global Campus (Kanakapura, Karnataka)**.
- **Goal:** Add easy CLI configs in `config.py` for other large campuses (e.g., IISc Bangalore, IIT Madras, BITS Pilani, or Central Park NY).
- **How:** Add bounding box presets in `config.py` so users can run `python cache_map.py --campus iisc`.

### 2. Multi-Language Audio Synthesis (Accessibility)
- **Goal:** Support regional and global voice guidance (Kannada, Hindi, Tamil, Spanish, German).
- **How:** Add a language dropdown in `web/index.html` and map language codes to Web Speech API / `pyttsx3` voice locales.

### 3. Spatial Audio Beacons & Haptics
- **Goal:** Improve the Web Audio API stereo panning sound cues for blind navigators.
- **How:** Add customizable beacon frequencies in `web/app.js` and trigger the Web Vibration API (`navigator.vibrate([100, 50, 100])`) for mobile walkers.

### 4. Elevation Profile Smoothing
- **Goal:** Render a continuous SVG elevation curve along the route in the UI.

---

## 🧪 Testing Your Changes

Before submitting your pull request, ensure all tests pass:

```bash
# Run unit and integration tests
npm test

# Verify web server loads without errors
npm start
```

---

## 📬 Pull Request Guidelines

1. **Branch Naming:** `feat/add-iisc-campus`, `fix/audio-panning`, `docs/update-readme`
2. **Commit Messages:** Use clear, descriptive commit messages (e.g. `feat(audio): add stereo panning turn cues`).
3. **Keep PRs Focused:** Small, single-purpose pull requests are reviewed and merged much faster.

Happy Hacking! 🚀
