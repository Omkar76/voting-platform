module.exports = {
  development: {
    username: "postgres",
    password: "postgres",
    database: "voting_dev",
    host: "db",
    dialect: "postgres",
  },
  test: {
    username: "postgres",
    password: "postgres",
    database: "voting_test",
    host: "db",
    dialect: "postgres",
    logging: false,
  },
  production: { 
    username: "postgres",
    password: "postgres",
    database: "voting_prod",
    host: "db",
    dialect: "postgres",
  },
};
