# Nova AI Chat

A polished AI chat website built with HTML5, CSS3, and vanilla JavaScript. It includes:

- Responsive glassmorphism UI
- Multiple chat sessions with local storage
- Rename, delete, search, and import/export of conversations
- OpenAI-compatible API streaming support
- Dark mode by default and theme switching

## Files

- index.html — app shell and structure
- style.css — visual design and responsive layout
- script.js — application orchestration and event handling
- api.js — AI API communication
- config.js — configurable API settings
- storage.js — persistence helpers
- ui.js — rendering and UI feedback
- utils.js — shared helpers

## Run locally

Open the folder in VS Code and use Live Server, or open index.html directly in a browser.

## Deployment

This project is a static site and can be deployed to GitHub Pages.

1. Install `git` and `gh` (GitHub CLI).
2. Open a terminal in this folder.
3. Run `deploy.bat <github-username>/<repo-name>`.

The repository must be created or created automatically by `gh`.

A GitHub Actions workflow is already included at `.github/workflows/deploy-static-site.yml`.

## Notes

Provide an API key, base URL, and model in Settings before sending prompts.
