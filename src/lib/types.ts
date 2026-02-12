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
    tipo: 'Pontual' | 'Recorrente'
    descricao: string | null
    valor: number | null
    data_pagamento: string | null
    status_pagamento: 'Pendente' | 'Pago'
    data_inicio: string | null
    data_conclusao: string | null
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
    valor_total_receber: number
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
