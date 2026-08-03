/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // xlsx is only used server-side; keep it external to the client bundle.
  serverExternalPackages: ["xlsx"],
};

export default nextConfig;
