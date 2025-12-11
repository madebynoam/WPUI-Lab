/** @type {import('next').NextConfig} */
const nextConfig = {
  // Empty turbopack config to silence Next.js 16 warning
  turbopack: {},

  webpack: (config, { isServer }) => {
    // Exclude Node.js-only modules from client bundle
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Make direct-provider resolve to false in browser (not bundled)
        './direct-provider': false,
        './direct-provider.ts': false,
      };

      // Also mark these Node.js SDKs as externals for browser
      config.externals = config.externals || [];
      config.externals.push({
        'openai': 'commonjs openai',
        '@anthropic-ai/sdk': 'commonjs @anthropic-ai/sdk',
      });
    }
    return config;
  },
};

export default nextConfig;
