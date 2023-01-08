module.exports = {
  development: {
    username: "postgres",
    password: "postgres",
    database: "voting_dev",
    host: "127.0.0.1",
    dialect: "postgres",
  },
  test: {
    username: "postgres",
    password: "postgres",
    database: "voting_test",
    host: "127.0.0.1",
    dialect: "postgres",
    logging: false,
  },
  production: {
    username: "postgres",
    password: "postgres",
    database: "voting_prod",
    host: "127.0.0.1",
    dialect: "postgres",
  },
};
