---
description: Workflow de deploy - NUNCA pular etapas
---

# Workflow de Deploy

**REGRA ABSOLUTA: Nunca fazer push sem aprovação do usuário.**

## Passos obrigatórios:

1. Fazer as alterações no código localmente
2. Garantir que `npm run dev` está rodando para o usuário testar em `http://localhost:5173/`
3. Informar o usuário sobre as mudanças feitas
4. **AGUARDAR aprovação explícita do usuário**
5. Somente após aprovação, **CRIAR O REGISTRO DO CHANGELOG NO SUPABASE**:
   - Você (Agente AI) **DEVE** obrigatoriamente usar a ferramenta `mcp_supabase-mcp-server_execute_sql` para inserir um registro na tabela `sistema_atualizacoes` (com tipo, titulo e descricao) descrevendo as implementações desta versão ANTES de dar o git push.
6. Após inserir no banco:
```bash
git add -A
git commit -m "descrição da mudança"
// turbo
git push
```
7. Cloudflare Pages faz deploy automático ao detectar o push

## ⚠️ NUNCA:
- Fazer `git push` sem o usuário aprovar
- Pular a etapa de teste local
- Combinar mudança + push na mesma ação
