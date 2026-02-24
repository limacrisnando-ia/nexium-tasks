export interface Cliente {
    id: string
    nome: string
    contato: string | null
    empresa: string | null
    status: 'Ativo' | 'Inativo' | 'Prospect'
    data_cadastro: string | null
    created_at: string | null
    updated_at: string | null
}

export interface Projeto {
    id: string
    nome_projeto: string
    cliente_id: string | null
    tipo: 'Site' | 'Automação'
    descricao: string | null
    valor_total: number | null
    modelo_pagamento: 'Integral' | '50/50'
    valor_entrada: number | null
    status_entrada: 'Pendente' | 'Pago'
    data_entrada: string | null
    valor_entrega: number | null
    status_entrega: 'Pendente' | 'Pago'
    data_entrega: string | null
    valor_manutencao: number | null
    status_manutencao: 'Ativo' | 'Inativo'
    data_inicio: string | null
    data_conclusao: string | null
    created_at: string | null
    updated_at: string | null
}

export interface ProjetoAnotacao {
    id: string
    projeto_id: string
    titulo: string
    conteudo: string | null
    usuario_id: string | null
    created_at: string | null
    updated_at: string | null
}

export interface ProjetoAcesso {
    id: string
    projeto_id: string
    usuario_id: string
    nome: string
    url: string | null
    usuario: string | null
    senha: string | null
    created_at: string | null
    updated_at: string | null
}

export interface Tarefa {
    id: string
    titulo: string
    descricao: string | null
    cliente_id: string | null
    projeto_id: string | null
    prazo: string | null
    status: 'A Fazer' | 'Em Andamento' | 'Concluída'
    prioridade: 'Alta' | 'Média' | 'Baixa'
    data_criacao: string | null
    data_conclusao: string | null
    created_at: string | null
    updated_at: string | null
}

export interface DashboardMetricas {
    clientes_ativos: number
    tarefas_pendentes: number
    tarefas_proximos_7_dias: number
    tarefas_hoje: number
    valor_a_receber: number
    valor_faturado: number
    receita_recorrente: number
    tarefas_atrasadas: number
}

export interface ProximaTarefa {
    id: string
    titulo: string
    descricao: string | null
    prazo: string | null
    status: string
    prioridade: string
    cliente_nome: string | null
    nome_projeto: string | null
    urgencia: string
}

export interface ValorTotalCliente {
    id: string
    nome: string
    empresa: string | null
    status: string
    valor_total_faturado: number
    valor_pendente: number
    total_projetos: number
}

export interface TarefasPendentesCliente {
    cliente_id: string
    cliente_nome: string
    total_tarefas_pendentes: number
    tarefas_a_fazer: number
    tarefas_em_andamento: number
    tarefas_atrasadas: number
}

export interface SistemaAtualizacao {
    id: string
    tipo: 'Novo' | 'Melhoria' | 'Correção' | 'Aviso'
    titulo: string
    descricao: string
    data: string
    created_at: string | null
    updated_at: string | null
}
