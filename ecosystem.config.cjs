// ponytail: APP_ENV est fourni par le workflow de déploiement (prod | staging).
// Sans lui on tombe sur "local" — jamais le nom d'une app déployée, donc pas de collision.
module.exports = {
  apps: [
    {
      name: `the-ridge-${process.env.APP_ENV || "local"}`,
      script: "dist/index.js",
      env_file: ".env",
    },
  ],
};
