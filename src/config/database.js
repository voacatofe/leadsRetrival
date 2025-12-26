import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const isDev = process.env.NODE_ENV === 'development';

if (!process.env.DATABASE_URL) {
  console.error('❌ ERRO CRÍTICO: DATABASE_URL não está definida no ambiente.');
} else {
  console.log('✅ DATABASE_URL encontrada:', process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@')); // Log seguro
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: isDev ? console.log : false,
  // Opções adicionais podem ser necessárias dependendo do provedor de banco de dados (ex: SSL)
});

export default sequelize;