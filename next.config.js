/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-Content-Type-Options",     value: "nosniff" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // Next.js requires these
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://rpc.testnet.arc.network https://5042002.rpc.thirdweb.com https://atlas.blockscout.com https://*.privy.io https://*.walletconnect.com wss://*.walletconnect.com https://auth.privy.io",
              "frame-src https://*.privy.io",
            ].join("; "),
          },
        ],
      },
    ]
  },

  // Webpack: fix for wagmi/viem in Next.js
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs:     false,
      net:    false,
      tls:    false,
      crypto: false,
    }
    return config
  },
}

module.exports = nextConfig
