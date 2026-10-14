import type { NextConfig } from "next";

type RemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
};

function remotePatternFromUrl(value?: string): RemotePattern | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port || undefined
    };
  } catch {
    return null;
  }
}

function buildImageRemotePatterns(): RemotePattern[] {
  const patterns: RemotePattern[] = [
    {
      protocol: "https",
      hostname: "images.unsplash.com"
    },
    {
      protocol: "https",
      hostname: "vl-stock-images.s3.ap-southeast-1.amazonaws.com"
    }
  ];
  const r2PublicPattern = remotePatternFromUrl(process.env.R2_PUBLIC_URL);
  const legacyS3PublicPattern = remotePatternFromUrl(
    process.env.S3_PUBLIC_URL_PREFIX
  );

  if (r2PublicPattern) {
    patterns.push(r2PublicPattern);
  }

  if (legacyS3PublicPattern) {
    patterns.push(legacyS3PublicPattern);
  }

  return patterns.filter(
    (pattern, index, current) =>
      current.findIndex(
        (item) =>
          item.protocol === pattern.protocol &&
          item.hostname === pattern.hostname &&
          item.port === pattern.port
      ) === index
  );
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb"
    }
  },
  images: {
    remotePatterns: buildImageRemotePatterns()
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
