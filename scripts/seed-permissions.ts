import { prisma } from "../src/lib/prisma";

const defaultPermissions = [
  // Permissões de Tickets
  {
    key: "tickets.view",
    name: "Visualizar Tickets",
    description: "Permite visualizar tickets do sistema",
    category: "tickets",
  },
  {
    key: "tickets.create",
    name: "Criar Tickets",
    description: "Permite criar novos tickets",
    category: "tickets",
  },
  {
    key: "tickets.edit",
    name: "Editar Tickets",
    description: "Permite editar tickets existentes",
    category: "tickets",
  },
  {
    key: "tickets.delete",
    name: "Excluir Tickets",
    description: "Permite excluir tickets",
    category: "tickets",
  },
  {
    key: "tickets.assign",
    name: "Atribuir Tickets",
    description: "Permite atribuir tickets a outros usuários",
    category: "tickets",
  },

  // Permissões de Usuários
  {
    key: "users.view",
    name: "Visualizar Usuários",
    description: "Permite visualizar lista de usuários",
    category: "users",
  },
  {
    key: "users.create",
    name: "Criar Usuários",
    description: "Permite criar novos usuários",
    category: "users",
  },
  {
    key: "users.edit",
    name: "Editar Usuários",
    description: "Permite editar informações de usuários",
    category: "users",
  },
  {
    key: "users.delete",
    name: "Excluir Usuários",
    description: "Permite excluir usuários",
    category: "users",
  },

  // Permissões de Projetos
  {
    key: "projects.view",
    name: "Visualizar Projetos",
    description: "Permite visualizar projetos",
    category: "projects",
  },
  {
    key: "projects.create",
    name: "Criar Projetos",
    description: "Permite criar novos projetos",
    category: "projects",
  },
  {
    key: "projects.edit",
    name: "Editar Projetos",
    description: "Permite editar projetos existentes",
    category: "projects",
  },
  {
    key: "projects.delete",
    name: "Excluir Projetos",
    description: "Permite excluir projetos",
    category: "projects",
  },
  {
    key: "projects.manage_members",
    name: "Gerenciar Membros de Projetos",
    description: "Permite adicionar/remover membros de projetos",
    category: "projects",
  },

  // Permissões de Configurações
  {
    key: "config.view",
    name: "Visualizar Configurações",
    description: "Permite acessar a página de configurações",
    category: "config",
  },
  {
    key: "config.forms",
    name: "Gerenciar Formulários",
    description: "Permite criar e editar formulários",
    category: "config",
  },
  {
    key: "config.webhooks",
    name: "Gerenciar Webhooks",
    description: "Permite criar e editar webhooks",
    category: "config",
  },
  {
    key: "config.permissions",
    name: "Gerenciar Permissões",
    description: "Permite configurar permissões de usuários",
    category: "config",
  },

  // Permissões de Relatórios
  {
    key: "reports.view",
    name: "Visualizar Relatórios",
    description: "Permite acessar relatórios do sistema",
    category: "reports",
  },
  {
    key: "reports.export",
    name: "Exportar Relatórios",
    description: "Permite exportar relatórios",
    category: "reports",
  },

  // Permissões de Base de Conhecimento
  {
    key: "knowledge.view",
    name: "Visualizar Base de Conhecimento",
    description: "Permite visualizar artigos da base de conhecimento",
    category: "knowledge",
  },
  {
    key: "knowledge.documents.view",
    name: "Visualizar Documentos",
    description: "Permite acessar e visualizar documentos na base de conhecimento",
    category: "knowledge",
  },
  {
    key: "knowledge.files.view",
    name: "Visualizar Arquivos",
    description: "Permite acessar e visualizar arquivos na base de conhecimento",
    category: "knowledge",
  },
  {
    key: "knowledge.create",
    name: "Criar Artigos",
    description: "Permite criar novos artigos na base de conhecimento",
    category: "knowledge",
  },
  {
    key: "knowledge.edit",
    name: "Editar Artigos",
    description: "Permite editar artigos existentes",
    category: "knowledge",
  },
  {
    key: "knowledge.delete",
    name: "Excluir Artigos",
    description: "Permite excluir artigos",
    category: "knowledge",
  },
  {
    key: "knowledge.passwords.manage",
    name: "Gerenciar Senhas",
    description: "Permite acessar e gerenciar a aba de senhas na base de conhecimento",
    category: "knowledge",
  },

  // Permissões de Páginas (Acesso)
  {
    key: "page.home",
    name: "Acessar Página Inicial",
    description: "Permite acessar a página inicial do sistema",
    category: "pages",
  },
  {
    key: "dobby.use",
    name: "Usar Dobby Assistente",
    description: "Permite usar o assistente virtual Dobby na página inicial",
    category: "home",
  },
  {
    key: "page.tickets",
    name: "Acessar Tickets",
    description: "Permite acessar a página de tickets",
    category: "pages",
  },
  {
    key: "page.base",
    name: "Acessar Base de Conhecimento",
    description: "Permite acessar a página de base de conhecimento",
    category: "pages",
  },
  {
    key: "page.agenda",
    name: "Acessar Agenda",
    description: "Permite acessar a página de agenda",
    category: "pages",
  },
  {
    key: "page.history",
    name: "Acessar Histórico",
    description: "Permite acessar a página de histórico",
    category: "pages",
  },
  {
    key: "page.reports",
    name: "Acessar Relatórios",
    description: "Permite acessar a página de relatórios",
    category: "pages",
  },
  {
    key: "page.approvals",
    name: "Acessar Aprovações",
    description: "Permite acessar a página de aprovações",
    category: "pages",
  },
  {
    key: "page.projects",
    name: "Acessar Projetos",
    description: "Permite acessar a página de projetos",
    category: "pages",
  },
  {
    key: "page.config",
    name: "Acessar Configurações",
    description: "Permite acessar a página de configurações",
    category: "pages",
  },
  {
    key: "page.users",
    name: "Acessar Usuários",
    description: "Permite acessar a página de usuários",
    category: "pages",
  },
];

async function main() {
  console.log("🌱 Iniciando seed de permissões...");

  for (const perm of defaultPermissions) {
    try {
      await prisma.permission.upsert({
        where: { key: perm.key },
        update: {
          name: perm.name,
          description: perm.description,
          category: perm.category,
        },
        create: perm,
      });
      console.log(`✅ Permissão criada/atualizada: ${perm.key}`);
    } catch (error) {
      console.error(`❌ Erro ao criar permissão ${perm.key}:`, error);
    }
  }

  console.log("✨ Seed de permissões concluído!");
}

main()
  .catch((e) => {
    console.error("Erro ao executar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

