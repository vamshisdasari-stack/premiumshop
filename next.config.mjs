const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  }, typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true }, images: { remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }, { protocol: "https", hostname: "images.unsplash.com" }] }, poweredByHeader: false }; export default nextConfig;
