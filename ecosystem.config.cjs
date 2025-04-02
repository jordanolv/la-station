module.exports = {
  apps: [
    {
      name: "la-station-bot",
      script: "dist/bot/app.js",
      cwd: "./src/bot",
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};
