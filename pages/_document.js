import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#080a14" />
        <meta
          name="description"
          content="The Daily PYQ Challenge — 3 previous-year JEE/NEET questions every day. Show up daily, build your streak, and climb the leaderboard. Most consistent student tops the board."
        />

        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <link rel="mask-icon" href="/favicon.svg" color="#8b6cf7" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PYQ Daily" />
        <meta property="og:url" content="https://daily-pyq.vercel.app/" />
        <meta property="og:title" content="The Daily PYQ Challenge — 3 JEE/NEET questions a day" />
        <meta
          property="og:description"
          content="Show up daily, build a streak, and see who's the most consistent. Free. Join the challenge 👉"
        />
        <meta property="og:image" content="https://daily-pyq.vercel.app/og.svg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="The Daily PYQ Challenge — 3 JEE/NEET questions a day" />
        <meta
          name="twitter:description"
          content="Show up daily, build a streak, and see who's the most consistent. Free. Join the challenge 👉"
        />
        <meta name="twitter:image" content="https://daily-pyq.vercel.app/og.svg" />

        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
