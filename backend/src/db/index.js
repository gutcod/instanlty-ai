import Knex from 'knex';

const knex = Knex({
  client: 'sqlite3',
  connection: {
    filename: './dev.sqlite3',
  },
  useNullAsDefault: true,
});

export default knex;
