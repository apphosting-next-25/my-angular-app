import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gemini20Flash, googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

enableFirebaseTelemetry();
const ai = genkit({
  plugins: [googleAI()],
  model: gemini20Flash, // set default model
});

app.use(express.json());
app.post('/api/gemini', async (req, res) => {
  const prompt = req.body.prompt;

  if (!prompt) {
    res.json({ output: 'no prompt provided' });
  } else {
    console.log(`prompt: "${prompt}"`);
    const { text } = await ai.generate({prompt: prompt, system: "talk like a pirate"});
    res.json({ output: text });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use('/**', (req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
