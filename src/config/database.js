import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const isDev = process.env.NODE_ENV === 'development';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: isDev ? console.log : false,
  // Opções adicionais podem ser necessárias dependendo do provedor de banco de dados (ex: SSL)
});

export default sequelize;