const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Configuração via Variáveis de Ambiente na Render
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// Rota de Cadastro usando API do Supabase (HTTPS)
app.post('/api/admin/cadastrar-aluno', async (req, res) => {
    console.log("📥 Recebi um pedido de cadastro:", req.body);
    const { nome, cpf, senha } = req.body;

    const { data, error } = await supabase
        .from('alunos')
        .insert([{ nome, cpf, senha }])
        .select();

    if (error) {
        console.error('❌ Erro Supabase:', error);
        return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ success: true, aluno: data[0] });
});

// Rota de Login
app.post('/api/login', async (req, res) => {
    const { cpf, senha } = req.body;
    const { data, error } = await supabase
        .from('alunos')
        .select('id, nome, cpf')
        .eq('cpf', cpf)
        .eq('senha', senha)
        .single();

    if (error || !data) return res.status(401).json({ error: 'Credenciais inválidas.' });
    return res.json({ success: true, aluno: data });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando via API na porta ${PORT}!`));