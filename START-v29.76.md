# Apply the website update

Download and extract Better-Real-Estate-v29.76-Website.zip into Downloads.

```bash
python3 ~/Downloads/Better-Real-Estate-v29.76/install-update.py ~/Downloads/Better-Real-Estate
cd ~/Downloads/Better-Real-Estate
npm ci
npm test
node --check server.js
node --check public/app.js
git diff --check
git status --short
```

Stop if the installer reports a mismatch or any check fails. The updater prints the location of its automatic backup. Review RELEASE-v29.76.md for changed behavior and validation limits.

After checks pass:

```bash
sh ~/Downloads/Better-Real-Estate-v29.76/stage-update.sh ~/Downloads/Better-Real-Estate
cd ~/Downloads/Better-Real-Estate
git commit -m "Complete website usability and marketplace update"
git push
```

A push publishes only if the repository's existing hosting integration is configured to deploy that branch. This bundle does not change account credentials, hosting connections or signing capabilities.
