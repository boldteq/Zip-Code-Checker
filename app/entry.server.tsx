import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { type EntryContext } from "react-router";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";

export const streamTimeout = 5000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext
) {
  addDocumentResponseHeaders(request, responseHeaders);

  // Allow Chatwoot live-chat widget inside the Shopify admin iframe
  const csp = responseHeaders.get("Content-Security-Policy");
  if (csp) {
    const chatwootDomain = "https://app.chatwoot.com";
    let updatedCsp = csp;
    updatedCsp = updatedCsp.replace(
      /script-src\s/,
      `script-src ${chatwootDomain} `,
    );
    updatedCsp = updatedCsp.replace(
      /connect-src\s/,
      `connect-src ${chatwootDomain} wss://app.chatwoot.com `,
    );
    updatedCsp = updatedCsp.replace(
      /frame-src\s/,
      `frame-src ${chatwootDomain} `,
    );
    updatedCsp = updatedCsp.replace(
      /img-src\s/,
      `img-src ${chatwootDomain} `,
    );
    updatedCsp = updatedCsp.replace(
      /style-src\s/,
      `style-src ${chatwootDomain} `,
    );
    responseHeaders.set("Content-Security-Policy", updatedCsp);
  }

  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? '')
    ? "onAllReady"
    : "onShellReady";

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
      />,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        },
      }
    );

    // Automatically timeout the React renderer after 6 seconds, which ensures
    // React has enough time to flush down the rejected boundary contents
    setTimeout(abort, streamTimeout + 1000);
  });
}
