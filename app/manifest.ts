import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://chack.dev";
  
  return {
    name: "CHACK - Autonomous AI Pentest Agent",
    short_name: "CHACK",
    description: "Autonomous AI pentest agent for blackbox and whitebox security assessments",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0ea5e9",
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}

