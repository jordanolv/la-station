module.exports = {
  apps: [
    {
      name: "la-station-bot",
      script: "dist/index.js",
      env_file: ".env",
      env: { NODE_ENV: "production" },
    },
  ],
};
