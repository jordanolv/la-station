module.exports = {
  apps: [
    {
      name: "the-ridge-bot",
      script: "dist/index.js",
      env_file: ".env",
      env: { NODE_ENV: "production" },
    },
  ],
};
