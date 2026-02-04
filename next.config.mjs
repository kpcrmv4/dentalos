/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Optimize package imports (from React Best Practices)
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-table'],
  },
}

export default nextConfig
