const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const app = express();

// Configuração de CORS para permitir requisições do seu Vercel e outros
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Rota de Cadastro de Aluno
app.post('/api/admin/cadastrar-aluno', async (req, res) => {
    const { nome, cpf, senha } = req.body;
    const { data, error } = await supabase.from('alunos').insert([{ nome, cpf, senha }]).select();
    
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ success: true, aluno: data[0] });
});

// Rota de Login
app.post('/api/login', async (req, res) => {
    const { cpf, senha } = req.body;
    const { data, error } = await supabase.from('alunos')
        .select('id, nome, cpf')
        .eq('cpf', cpf)
        .eq('senha', senha)
        .single();

    if (error || !data) return res.status(401).json({ error: 'Credenciais inválidas.' });
    return res.json({ success: true, aluno: data });
});

// Rota de Dashboard (Carrega Cursos e Quadrinhos)
app.get('/api/dashboard', async (req, res) => {
    try {
        const { data: courses, error: coursesError } = await supabase.from('cursos').select('*');
        if (coursesError) {
            console.error("❌ Erro na tabela 'cursos':", coursesError);
            throw coursesError;
        }

        const { data: comics, error: comicsError } = await supabase.from('quadrinhos').select('*');
        if (comicsError) {
            console.error("❌ Erro na tabela 'quadrinhos':", comicsError);
            throw comicsError;
        }
        
        return res.json({ 
            success: true, 
            liveSession: { isLive: false },
            courses: courses || [], 
            comics: comics || [] 
        });
    } catch (error) {
        console.error("💥 Erro fatal no endpoint /api/dashboard:", error.message || error);
        return res.status(500).json({ error: 'Erro ao carregar dashboard', details: error.message });
    }
});

// Inicialização do Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}!`);
});