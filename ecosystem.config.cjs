module.exports = {
  apps: [
    {
      name: "la-station-bot-dev",
      script: "./dist/bot/app.js",
      cwd: ".",
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};
