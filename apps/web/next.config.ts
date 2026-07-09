import type { NextConfig } from "next";

const hasGoogleMapsKeyAtBuild = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim());
const hasGoogleMapsUrlAtBuild = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_URL?.trim());

console.info("[GoogleMapsDiagnostic][build]", {
  hasGoogleMapsKeyAtBuild,
  hasGoogleMapsUrlAtBuild,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
