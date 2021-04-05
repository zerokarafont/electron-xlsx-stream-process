import { session, app } from "electron";

const selfHost = `http://localhost:3000`;

export default function configureSecurityStragety(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "font-src https://static2.sharepointonline.com https://spoprod-a.akamaihd.net",
          "img-src https://spoprod-a.akamaihd.net 'self'",
        ],
      },
    });
  });

  // // https://electronjs.org/docs/tutorial/security#12-disable-or-limit-navigation
  // app.on("web-contents-created", (event, contents) => {
  //   contents.on("will-navigate", (contentsEvent, navigationUrl) => {
  //     /* eng-disable LIMIT_NAVIGATION_JS_CHECK  */
  //     const parsedUrl = new URL(navigationUrl);
  //     const validOrigins = [selfHost];

  //     // Log and prevent the app from navigating to a new page if that page's origin is not whitelisted
  //     if (!validOrigins.includes(parsedUrl.origin)) {
  //       console.error(
  //         `The application tried to redirect to the following address: '${parsedUrl}'. This origin is not whitelisted and the attempt to navigate was blocked.`
  //       );

  //       contentsEvent.preventDefault();
  //     }
  //   });

  //   contents.on("will-redirect", (contentsEvent, navigationUrl) => {
  //     const parsedUrl = new URL(navigationUrl);
  //     const validOrigins = [];

  //     // Log and prevent the app from redirecting to a new page
  //     if (!validOrigins.includes(parsedUrl.origin)) {
  //       console.error(
  //         `The application tried to redirect to the following address: '${navigationUrl}'. This attempt was blocked.`
  //       );

  //       contentsEvent.preventDefault();
  //     }
  //   });

  //   // https://electronjs.org/docs/tutorial/security#11-verify-webview-options-before-creation
  //   contents.on(
  //     "will-attach-webview",
  //     (contentsEvent, webPreferences, params) => {
  //       // Strip away preload scripts if unused or verify their location is legitimate
  //       delete webPreferences.preload;
  //       delete webPreferences.preloadURL;

  //       // Disable Node.js integration
  //       webPreferences.nodeIntegration = false;
  //     }
  //   );

  //   // https://electronjs.org/docs/tutorial/security#13-disable-or-limit-creation-of-new-windows
  //   contents.on("new-window", (contentsEvent, navigationUrl) => {
  //     /* eng-disable LIMIT_NAVIGATION_JS_CHECK */
  //     const parsedUrl = new URL(navigationUrl);
  //     const validOrigins = [];

  //     // Log and prevent opening up a new window
  //     if (!validOrigins.includes(parsedUrl.origin)) {
  //       console.error(
  //         `The application tried to open a new window at the following address: '${navigationUrl}'. This attempt was blocked.`
  //       );

  //       contentsEvent.preventDefault();
  //     }
  //   });
  // });
}
