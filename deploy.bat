@echo off
REM Deploy this static site to GitHub Pages using git and GitHub CLI.

if "%1"=="" (
  echo Usage: deploy.bat REPO_NAME
  echo Example: deploy.bat kumaran/nova-ai-chat
  exit /b 1
)

set REPO=%1

if not exist .git (
  git init
  git branch -M main
)

git add .
git commit -m "Deploy static site" 2>nul

gh repo create %REPO% --public --source=. --remote=origin --push

echo Deployment complete. If the repo already exists, run this instead:
echo   git push -u origin main