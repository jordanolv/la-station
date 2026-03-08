module.exports = {
  apps: [
    {
      name: "the-ridge-bot-dev",
      script: "dist/index.js",
      env_file: ".env",
      env: { NODE_ENV: "development" },
    },
  ],
};
