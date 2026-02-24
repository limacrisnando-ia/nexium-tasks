# Produto: Sistema de Organização (Nexium Tasks)
**Documentação Estratégica & Base de Conhecimento (PRD)**

Este documento serve como base de conhecimento atualizada do sistema para o proprietário e para futuras sessões de Inteligência Artificial (LM). Ele detalha a arquitetura atual, as funcionalidades implementadas, as estruturas de dados e o fluxo de uso da aplicação.

---

## 1. Visão Geral do Sistema
O **Sistema de Organização** é uma plataforma web (SaaS-like) projetada para centralizar a gestão de clientes, projetos, tarefas, anotações de trabalho, credenciais e arquivos. Ele substitui processos manuais e controles dispersos, oferecendo uma interface limpa, focada e multilíngue.

**Stack Tecnológico Atual:**
- **Frontend:** React (Vite), TypeScript, React Router DOM.
- **Estilização:** CSS Tradicional (sem dependência estrita de Tailwind, utilizando sistema de classes de design próprio).
- **Backend & Autenticação:** Supabase (Auth, Database PostgreSQL, Storage).
- **Hospedagem:** Vercel / Cloudflare Pages (Deploy Automático via Git).

---

## 2. Funcionalidades Principais

### Autenticação e Autorização (RBAC)
- **Login Seguro:** Autenticação gerenciada pelo Supabase.
- **Controle de Acesso:** Distinção entre usuários comuns e *Super Admins*. Rotas administrativas (`/admin/dashboard`, `/admin/usuarios`, `/admin/relatorios`) são protegidas e inacessíveis para usuários normais.

### Dashboard (Visão Geral)
- **Métricas Globais:** Clientes Ativos, Tarefas Pendentes, Tarefas para os próximos 7 dias, Tarefas Hoje, Valor a Receber, Valor Faturado, Receita Recorrente, Tarefas Atrasadas.
- **Listagens Rápidas:** Visão de "Próximas Tarefas".
- **Widgets de Faturamento:** Listagem de valores totais por cliente.

### Gestão de Clientes (`/clientes` e `/clientes/:id`)
O módulo central do sistema.
- **Listagem de Clientes:** Interface para visualizar todos os clientes (Ativos, Inativos, Prospects).
- **Detalhes do Cliente (A Visão de 360 Graus):**
  Ao abrir um cliente, o usuário tem acesso a 4 guias/seções essenciais:
  1. **Projetos:** Gestão de entregáveis e finanças atreladas ao cliente.
     - Status financeiros (ex: Entrada/Entrega, 50/50).
     - Valores de recorrência (ex: Manutenção para projetos de Automação).
     - **Sub-módulo Anotações:** Editor de blocos de texto atrelados a um projeto para registro de atas, decisões, links e guias. (Visualização Colapsável).
     - **Sub-módulo Acessos (Credenciais):** Gerenciador de senhas e acessos para ferramentas de terceiros daquele projeto (URL, Usuário, Senha com toggle de visibilidade `••••••`). (Visualização Colapsável).
  2. **Tarefas do Cliente:** Lista de afazeres diários com status (A Fazer, Em Andamento, Concluída), Prazos e Nível de Prioridade. Inclui barra de progresso visual.
  3. **Arquivos:** Upload, download e exclusão de arquivos enviados para o Supabase Storage associados a este cliente.

### Gestão Global de Tarefas (`/tarefas`)
- Visão unificada de todas as tarefas de todos os clientes.
- Permite ordenação, filtragem por status e identificação visual de tarefas atrasadas.

### Calendário (`/calendario`)
- Visão temporal (mensal/semanal) com os prazos (deadlines) das tarefas e dos projetos.
- Facilita o planejamento de capacidade e entrega.

### Painel Administrativo (Super Admin)
- Visão isolada para gerenciar acessos de outros usuários, relatórios gerais da plataforma, e configurações sistêmicas.

### Funcionalidades de Experiência (UX)
- **Modo Foco (`FocoContext`):** Possibilidade de alternar a visualização da tela para remover ruídos e focar apenas na execução.
- **Multilinguagem (`LanguageContext`):** Suporte nativo à internacionalização (pt-BR e en), utilizando chaves de tradução.
- **Design Colapsável:** Painéis otimizados para evitar o "peso visual" quando as informações (como notas e acessos) chegam a um grande volume.

---

## 3. Estrutura de Dados (Database / Supabase)

### Tabela `clientes`
Armazena as informações entidades-clientes.
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador Único |
| `nome` | Text | Nome do Cliente / Prospect |
| `empresa` | Text | Nome da Empresa |
| `status` | Enum | 'Ativo', 'Inativo', 'Prospect' |
| `contato` | Text | Meio de contato principal |

### Tabela `projetos`
Armazena o escopo de trabalho vendido/acordado.
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador Único |
| `cliente_id` | UUID | FK -> `clientes.id` |
| `nome_projeto` | Text | Nome da entrega (Ex: E-commerce Plus) |
| `tipo` | Enum | 'Site' | 'Automação' |
| `modelo_pagamento` | Enum | 'Integral' | '50/50' |
| `valor_total`, `valor_entrada`, `valor_entrega`, `valor_manutencao` | Decimal | Valores financeiros |
| `status_entrada`, `status_entrega`, `status_manutencao` | Enum | Progresso financeiro |
| `data_inicio`, `data_conclusao` | Date | Cronograma |

### Tabela `projeto_anotacoes`
Armazena textos documentais vinculados a um projeto específico.
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador Único |
| `projeto_id` | UUID | FK -> `projetos.id` |
| `titulo` | Text | Título ou Assunto da Nota |
| `conteudo` | Text | Corpo do texto |

### Tabela `projeto_acessos` 
Armazena credenciais confidenciais estruturadas vinculadas a um projeto.
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador Único |
| `projeto_id` | UUID | FK -> `projetos.id` |
| `nome` | Text | Plataforma (Ex: WordPress, Cloudflare) |
| `url` | Text | Link de acesso |
| `usuario` | Text | Email, Login ou Username |
| `senha` | Text | Senha armazenada (RLS assegura que só o usuário autorizado leia) |

### Tabela `tarefas`
Armazena itens executáveis.
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador Único |
| `cliente_id` | UUID | FK -> `clientes.id` |
| `projeto_id` | UUID | Opcional: FK -> `projetos.id` |
| `titulo`, `descricao` | Text | O que deve ser feito |
| `prioridade` | Enum | 'Alta', 'Média', 'Baixa' |
| `status` | Enum | 'A Fazer', 'Em Andamento', 'Concluída' |
| `prazo` | Date | Data de entrega limite (SLA) |

---

## 4. Próximos Passos (Evolução Contínua)
*Esta seção é um espaço para planejar o roadmap imediato do sistema.*
1. **Integrações de Agentes:** Evoluir o sistema de automação para se conectar diretamente a LMs / agentes autônomos.
2. **Sistema de Cobrança / Notificações:** Automação de envio de cobranças baseadas no status ('Pendente') de projetos.
3. **Dashboards Gerenciais:** Melhoria nos gráficos visuais (seção de Relatórios Administrativos).
4. **Histórico de Logs:** Tabela de auditoria sobre alterações (Ex: "Quem alterou a senha do painel X e que horas").

---

## 5. Notas para o LM (Instruções Sistêmicas)
- Sempre que criar uma nova tabela atrelada a métricas (ou ao usuário logado), lembre-se de seguir o padrão inserindo RLS (`Row Level Security`) onde o `user_id` é verificado via `auth.uid()`, a menos que seja uma tabela que dependa da FK de um cliente, no qual a segurança "em cascata" pode ser aplicada (Acesso -> Projeto -> Cliente -> Usuário).
- As alterações visuais deverão preferencialmente respeitar a ausência de bibliotecas de componentes externas pesadas, operando de forma customizada para extrair alta performance e o visual "SaaS limpo" consolidado no app.
- Nas listagens com muito volume visual (ex: Projetos → Anotações/Acessos), padronizar os contêineres colapsáveis (Accordions) para economizar dados de bateria e tempo de renderização visual.
- **ATUALIZAÇÃO OBRIGATÓRIA:** Sempre que uma nova funcionalidade, tabela ou grande refatoração for concluída com sucesso para o usuário, o LM DEVE vir a este documento `DOCUMENTACAO_PRD.md` e registrar a atualização na seção "Registro de Atualizações (Changelog)" abaixo, além de atualizar as seções de Estrutura de Dados e Funcionalidades Principais conforme necessário. NUNCA finalize uma nova feature sem documentá-la aqui.

---

## 6. Registro de Atualizações (Changelog)
*Este histórico mantém o rastreio da evolução do sistema para que a base de conhecimento nunca fique desatualizada.*

- **[24/02/2026] Feature: Acessos do Projeto (Credenciais)**
  - Criação da tabela `projeto_acessos` com políticas RLS.
  - Implementação do CRUD no front-end (`ClienteDetalhe.tsx`), isolando "Anotações" de "Acessos" (senhas, links, usuários).
  - Componentização visual colapsável (Accordions) para otimizar espaço em tela.
  - Integração no dashboard para linkar as senhas das plataformas vendidas aos clientes (Site, Automação).
- **[Versão Inicial] MVP de Gestão**
  - Sistema base de clientes, projetos, tarefas e calendário. Autenticação, métricas e RLS configurados.
