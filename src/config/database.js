import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { URL } from 'url';

dotenv.config();

const isDev = process.env.NODE_ENV === 'development';

/**
 * Função para analisar e corrigir a configuração do banco de dados.
 * Resolve o problema onde DATABASE_URL chega sem credenciais (ex: postgresql://:@db:5432/)
 */
const getDatabaseConfig = () => {
  const rawUrl = process.env.DATABASE_URL;
  let config = {
    username: 'postgres',
    password: 'postgres',
    database: 'leads_db',
    host: 'db',
    port: 5432,
    dialect: 'postgres',
  };

  if (!rawUrl) {
    console.error('❌ ERRO CRÍTICO: DATABASE_URL não está definida no ambiente. Usando valores padrão.');
    return config;
  }

  try {
    const parsedUrl = new URL(rawUrl);

    // Extrair valores da URL se existirem, senão mantém os defaults
    if (parsedUrl.username) config.username = parsedUrl.username;
    if (parsedUrl.password) config.password = parsedUrl.password;
    if (parsedUrl.hostname) config.host = parsedUrl.hostname;
    if (parsedUrl.port) config.port = parsedUrl.port;
    
    // pathname vem como "/leads_db", removemos a barra
    if (parsedUrl.pathname && parsedUrl.pathname.length > 1) {
      config.database = parsedUrl.pathname.substring(1);
    }

    // Verificação específica para o erro "no PostgreSQL user name specified"
    if (!parsedUrl.username) {
      console.warn('⚠️ AVISO: DATABASE_URL não contém usuário. Aplicando credenciais padrão (postgres/postgres).');
    }

  } catch (error) {
    console.error('❌ Erro ao fazer parse da DATABASE_URL:', error.message);
    console.log('🔄 Usando configuração de fallback baseada no .env conhecido.');
  }

  return config;
};

const dbConfig = getDatabaseConfig();

// Log seguro da configuração final
console.log('✅ Configuração de Banco de Dados Final:', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  username: dbConfig.username,
  // Mascarando a senha para segurança
  password: dbConfig.password ? '****' : '(sem senha)'
});

// Inicializa o Sequelize passando os parâmetros explicitamente
// Isso é mais robusto do que passar apenas a string de conexão quando há problemas de parse
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: isDev ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

export default sequelize;