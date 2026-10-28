import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Clientes de correo (IMAP/SMTP): se cargan desde node_modules en el servidor.
  serverExternalPackages: ["imapflow", "nodemailer", "mailparser"],
  experimental: {
    // Documentos adjuntos a los objetivos (hasta 2 MB) y logos de facturación.
    serverActions: { bodySizeLimit: "3mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
