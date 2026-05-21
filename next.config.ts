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
  const publicPattern = remotePatternFromUrl(process.env.S3_PUBLIC_URL_PREFIX);
  const endpointPattern = remotePatternFromUrl(process.env.S3_ENDPOINT);
  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.S3_REGION?.trim();

  if (publicPattern) {
    patterns.push(publicPattern);
  }

  if (endpointPattern) {
    patterns.push(endpointPattern);
  }

  if (bucket && region) {
    patterns.push({
      protocol: "https",
      hostname:
        region === "us-east-1"
          ? `${bucket}.s3.amazonaws.com`
          : `${bucket}.s3.${region}.amazonaws.com`
    });
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
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb"
    }
  },
  images: {
    remotePatterns: buildImageRemotePatterns()
  }
};

export default nextConfig;
