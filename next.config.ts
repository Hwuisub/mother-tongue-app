import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

export async function generateBuildId() {
  return String(Date.now());
}
