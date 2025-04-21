// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "la-station-bot",
      cwd: `${__dirname}/dist/bot`,
      script: "app.js",
      env_file: `${__dirname}/.env`,
      env: { NODE_ENV: "production"},
    },
    {
      name: "la-station-front",
      cwd: `${__dirname}/src/frontend/dist`,
      script: "npx",
      args: "serve -s . -l 3050",
      env: { NODE_ENV: "production" },
    },
  ],
};