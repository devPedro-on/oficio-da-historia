const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Substitua com as suas credenciais reais do painel Supabase (Project Settings > API)
const supabaseUrl = 'https://ppnwzocksaruknfhhkwe.supabase.co';
const supabaseKey = 'sb_publishable_I3ItMMegByChFggd5eTpsg_7_YP76dN'; 
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(cors());
app.use(express.json());

// Exemplo de Login com a API do Supabase
app.post('/api/login', async (req, res) => {
    const { cpf, senha } = req.body;
    
    // Consulta a tabela 'alunos' usando a API
    const { data, error } = await supabase
        .from('alunos')
        .select('id, nome, cpf')
        .eq('cpf', cpf)
        .eq('senha', senha)
        .single();

    if (error || !data) return res.status(401).json({ error: 'CPF ou senha incorretos.' });
    
    return res.json({ success: true, aluno: data });
});

// Exemplo de Cadastro
app.post('/api/admin/cadastrar-aluno', async (req, res) => {
    const { nome, cpf, senha } = req.body;
    const { data, error } = await supabase
        .from('alunos')
        .insert([{ nome, cpf, senha }])
        .select();

    if (error) return res.status(500).json({ error: 'Erro ao cadastrar.' });
    return res.status(201).json({ success: true, aluno: data[0] });
});

// (Mantenha aqui as outras rotas e variáveis que já tinha)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando via API Supabase na porta ${PORT}!`));