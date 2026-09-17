module.exports = {
  apps: [
    {
      name: `the-ridge-${process.env.APP_ENV || "local"}`,
      script: "dist/index.js",
      env_file: ".env",
    },
  ],
};
