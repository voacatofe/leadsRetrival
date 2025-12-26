import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Lead = sequelize.define('Lead', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  leadgen_id: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  page_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'pages', // nome da tabela
      key: 'id',
    },
  },
  form_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  created_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  field_data: {
    type: DataTypes.JSONB, // Armazena os dados do lead como JSON
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('new', 'processed'),
    defaultValue: 'new',
  },
}, {
  tableName: 'leads',
  timestamps: true,
});

export default Lead;