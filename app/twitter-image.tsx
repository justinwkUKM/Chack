import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CHACK - Autonomous AI Pentest Agent";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            padding: 40,
          }}
        >
          <div
            style={{
              fontSize: 120,
              fontWeight: "bold",
              letterSpacing: "-0.02em",
            }}
          >
            CHACK
          </div>
          <div
            style={{
              fontSize: 48,
              textAlign: "center",
              maxWidth: 1000,
              lineHeight: 1.2,
              opacity: 0.95,
            }}
          >
            Autonomous AI Pentest Agent
          </div>
          <div
            style={{
              fontSize: 32,
              textAlign: "center",
              maxWidth: 900,
              marginTop: 20,
              opacity: 0.9,
            }}
          >
            Find vulnerabilities before attackers do
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

