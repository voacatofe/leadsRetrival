import sequelize from './config/database.js';
import './models/index.js'; // Importa models para garantir que sejam registrados

const syncDB = async () => {
  try {
    console.log('Iniciando sincronização do banco de dados...');
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    // { force: false } cria tabelas se não existirem, mas não apaga dados existentes
    // Use { force: true } apenas em desenvolvimento para recriar tabelas do zero
    await sequelize.sync({ force: false });
    
    console.log('Tabelas sincronizadas com sucesso.');
  } catch (error) {
    console.error('Erro ao sincronizar o banco de dados:', error);
  } finally {
    await sequelize.close();
  }
};

syncDB();