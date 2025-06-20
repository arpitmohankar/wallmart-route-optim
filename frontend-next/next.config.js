// /** @type {import('next').NextConfig} */
// const nextConfig = {};

// export default nextConfig;

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({
  reactStrictMode: true,
  images: {
    domains: ['api.mapbox.com', 'localhost'],
  },
  // This helps with CORS during development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ]
  }
})

module.exports = nextConfig
