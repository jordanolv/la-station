// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "theridge-bot",
      script: "dist/index.js",
      env_file: ".env",
      env: { NODE_ENV: "production"},
    },
    {
      name: "theridge-front",
      cwd: `${__dirname}/src/frontend/dist`,
      script: "npx",
      args: ["serve", "-s", ".", "-l", "3050"],
      env: { NODE_ENV: "production" },
    },
  ],
};