
# Add all changes
git add .

# Commit with detailed message
git commit -m "Fix: Hardcode recipient to jobspeakpro@gmail.com to prevent env var overrides"

# Push to origin (which triggers Railway)
git push origin main
