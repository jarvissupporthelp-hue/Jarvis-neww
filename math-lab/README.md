# JARVIS math lab

This is the MathSpace React/Vite application adapted for JARVIS. It builds into
`../public/math-lab/` and is displayed by the JARVIS `/math-visualization` page.
The topic chooser passes an allowlisted `module` query parameter to the lab.

The root `npm run dev` and `npm run build` scripts install the locked lab
dependencies and build the lab automatically. To work on the lab alone, run
`npm ci` and `npm run dev` here. Run `npm run lint` and `npm run build` here
before changing the JARVIS integration.

The old experimental local Ollama chat was removed. The math tools run in the
browser and do not require the student's local services or credentials.
