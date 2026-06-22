const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const app = express();
app.use(cors());
app.use(express.json());

// Cadastro
app.post('/api/admin/cadastrar-aluno', async (req, res) => {
    const { nome, cpf, senha } = req.body;
    const { data, error } = await supabase.from('alunos').insert([{ nome, cpf, senha }]).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ success: true, aluno: data[0] });
});

// Login
app.post('/api/login', async (req, res) => {
    const { cpf, senha } = req.body;
    const { data, error } = await supabase.from('alunos').select('id, nome, cpf').eq('cpf', cpf).eq('senha', senha).single();
    if (error || !data) return res.status(401).json({ error: 'Credenciais inválidas.' });
    return res.json({ success: true, aluno: data });
});

// A ROTA QUE EU TINHA REMOVIDO (Dashboard) - Agora ela precisa estar aqui:
app.get('/api/dashboard', async (req, res) => {
    try {
        // Aqui buscamos cursos e quadrinhos do Supabase
        const { data: courses } = await supabase.from('cursos').select('*');
        const { data: comics } = await supabase.from('quadrinhos').select('*');
        
        return res.json({ 
            success: true, 
            liveSession: { isLive: false }, // Ajuste conforme necessário
            courses: courses || [], 
            comics: comics || [] 
        });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao carregar dashboard' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}!`));