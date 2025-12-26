import User from './User.js';
import Page from './Page.js';
import Lead from './Lead.js';

// Definição das Associações

// Um Usuário tem muitas Páginas
User.hasMany(Page, {
  foreignKey: 'user_id',
  as: 'pages',
});

Page.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// Uma Página tem muitos Leads
Page.hasMany(Lead, {
  foreignKey: 'page_id',
  as: 'leads',
});

Lead.belongsTo(Page, {
  foreignKey: 'page_id',
  as: 'page',
});

export { User, Page, Lead };