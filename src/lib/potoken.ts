import { BotGuardClient } from 'bgutils-js/botguard';
import { buildURL, getHeaders, parseLooseJSON, USER_AGENT } from 'bgutils-js/utils';
import { WebPoMinter } from 'bgutils-js/webpo';
import { JSDOM } from 'jsdom';
import { Platform } from 'youtubei.js';

interface WebPoSignalOutputFunction {
  (
    buffer: Uint8Array
  ): Promise<(contentBinding: Uint8Array) => Promise<Uint8Array | undefined>>;
}
type WebPoSignalOutput = (WebPoSignalOutputFunction | undefined)[];

// This module is server-only (Next.js route handlers). It generates Proof of
// Origin (PO) tokens so YouTube lets us stream the FULL audio file instead of
// cutting us off after ~384KB with a 403.
//
// High-level flow (see BgUtils example "index-innertube.ts"):
//   1. Load a headless YouTube page + BotGuard interpreter/VM.
//   2. Run the BotGuard attestation to obtain an Integrity Token.
//   3. Build a WebPoMinter from it.
//   4. For each video, mint a content-bound token (binding = videoId) which is
//      then appended to the stream URL as ?pot=....

// Request key for YouTube's /youtubei/v1/att endpoint. It's a PUBLIC key that
// ships with youtubei.js/BgUtils (also readable from the page HTML), so the
// hard-coded default is safe. Keep it overridable via env for tidiness.
const REQUEST_KEY = process.env.YOUTUBE_REQUEST_KEY || 'O43z0dpjhgX20SCx4KAo';

async function loadBotGuard() {
  // jsdom "web" shims needed by the BotGuard VM
  const dom = new JSDOM('<!DOCTYPE html><html><head><meta charset="UTF-8"><title></title></head><body></body></html>', {
    url: 'https://www.youtube.com',
    referrer: 'https://www.youtube.com/',
    resources: { userAgent: USER_AGENT },
  });

  const pageResponse = await fetch('https://www.youtube.com', {
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.7',
      'user-agent': USER_AGENT,
    },
  });
  const pageHtml = await pageResponse.text();

  const ytConfig = pageHtml.match(/ytcfg\.set\((\{[\s\S]+?\})\);/)?.[1];
  if (!ytConfig) {
    throw new Error('BgUtils: could not find ytcfg in page HTML');
  }
  dom.window.yt = { config_: JSON.parse(ytConfig) };

  Object.assign(globalThis, {
    yt: dom.window.yt,
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    origin: dom.window.origin,
  });
  if (!('navigator' in globalThis)) {
    Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator });
  }

  const att = pageHtml.match(/window\.ytAtN\(\s*(\{[\s\S]+?\})\s*\)/);
  if (!att) {
    throw new Error('BgUtils: could not find challenge in page HTML');
  }

  const challengeResponse = parseLooseJSON(att[1]).R as {
    bgChallenge?: {
      interpreterUrl: { privateDoNotAccessOrElseTrustedResourceUrlWrappedValue: string };
      program: string;
      globalName: string;
    };
  };  if (!challengeResponse.bgChallenge) {
    throw new Error('BgUtils: could not get challenge');
  }

  const interpreterUrl =
    challengeResponse.bgChallenge.interpreterUrl
      .privateDoNotAccessOrElseTrustedResourceUrlWrappedValue;
  const bgScriptResponse = await fetch(`https:${interpreterUrl}`);
  const interpreterJavascript = await bgScriptResponse.text();
  new Function(interpreterJavascript)();

  return await BotGuardClient.create({
    program: challengeResponse.bgChallenge.program,
    globalName: challengeResponse.bgChallenge.globalName,
    globalObject: globalThis,
  });
}

async function createMinter(): Promise<WebPoMinter> {
  // Override youtubei.js's sandboxed eval: run the player script and return
  // the extracted/processed result object (contains `sig`, `n`, etc.).
  Platform.shim.eval = async (data) => {
    return new Function(data.output)();
  };

  const botGuardClient = await loadBotGuard();
  const webPoSignalOutput: WebPoSignalOutput = [];
  const botguardResponse = await botGuardClient.snapshot({ webPoSignalOutput });

  const payload = [REQUEST_KEY, botguardResponse];
  const integrityTokenResponse = await fetch(buildURL('GenerateIT', true), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const integrityTokenJson = (await integrityTokenResponse.json()) as [
    integrityToken: string,
    estimatedTtlSecs: number,
    mintRefreshThreshold: number,
    websafeFallbackToken: string,
  ];
  const [integrityToken, estimatedTtlSecs, mintRefreshThreshold, websafeFallbackToken] =
    integrityTokenJson;

  return await WebPoMinter.create(
    { integrityToken, estimatedTtlSecs, mintRefreshThreshold, websafeFallbackToken },
    webPoSignalOutput
  );
}

let minterPromise: Promise<WebPoMinter> | null = null;

function getMinter(): Promise<WebPoMinter> {
  if (!minterPromise) {
    minterPromise = createMinter();
    // If initialization fails, reset so the next call can retry
    minterPromise.catch(() => {
      minterPromise = null;
    });
  }
  return minterPromise;
}

export async function getPoToken(videoId: string): Promise<string | null> {
  try {
    const minter = await getMinter();
    return await minter.mintAsWebsafeString(videoId);
  } catch (error) {
    console.error(`Error minting PO token for ${videoId}:`, error);
    return null;
  }
}
