/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produce the minimal server bundle used by the production container.
  output: "standalone",
  // xlsx is only used server-side; keep it external to the client bundle.
  serverExternalPackages: ["xlsx"],
};

export default nextConfig;
