import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Page = sequelize.define('Page', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  page_id: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  access_token: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Token perpétuo da página',
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users', // nome da tabela
      key: 'id',
    },
  },
}, {
  tableName: 'pages',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['page_id'],
    },
  ],
});

export default Page;