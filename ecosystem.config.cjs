module.exports = {
  apps: [
    {
      name: process.env.NODE_ENV === "production" ? "the-ridge-bot" : "the-ridge-bot-dev",
      script: "dist/index.js",
      env_file: ".env",
      env: { NODE_ENV: process.env.NODE_ENV },
    },
  ],
};
