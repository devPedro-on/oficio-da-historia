const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Permite acesso do frontend
app.use(cors());
app.use(express.json());

// CONFIGURAÇÃO BLINDADA: Separada para evitar erro de parsing do driver pg
const pool = new Pool({
    user: 'postgres.ppnwzocksaruknfhhkwe',
    host: 'aws-0-sa-east-1.pooler.supabase.com',
    database: 'postgres',
    password: 'EluQy94XGVa3zg3f',
    port: 6543,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000 
});

// Tratamento de erro silencioso para evitar derrubar o servidor
pool.on('error', (err) => console.error('Erro no pool de conexões:', err));

// Base de dados simulada
let courses = [
    {
        id: "curso_vikings",
        title: "A Era dos Vikings: Mitologia e Conquistas",
        description: "Explore a fundo as táticas de navegação, a organização social dos clãs e os mitos de Odin, Thor e o Ragnarok.",
        thumbnail: "https://images.unsplash.com/photo-1599733589046-10c005739ef9?auto=format&fit=crop&w=600&q=80",
        category: "Cultura Nórdica",
        progress: 50
    },
    {
        id: "curso_grecia",
        title: "Mitologia Grega e Filosofia Clássica",
        description: "Entenda a transição do pensamento mítico dos deuses do Olimpo para o nascimento da razão com os filósofos de Atenas.",
        thumbnail: "https://images.unsplash.com/photo-1564399579883-451a5d44ff08?auto=format&fit=crop&w=600&q=80",
        category: "Grécia Antiga",
        progress: 12
    }
];

let comics = [
    { id: "hq_1", title: "Capítulo 1: O Cerco", series: "Crônicas de Wessex", cover: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80" },
    { id: "hq_2", title: "Ragnarok: O Fim", series: "Deuses do Norte", cover: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80" },
    { id: "hq_3", title: "Gladiadores da Noite", series: "Roma Imperatriz", cover: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=300&q=80" },
    { id: "hq_4", title: "Mitologia: Bastidores", series: "Especial", cover: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=300&q=80" }
];

let liveSession = {
    isLive: true,
    title: "Módulo Especial: A Invasão de Lindisfarne",
    description: "A aula ao vivo já começou no Google Meet! Clica abaixo para entrares na sala, ligares a tua câmara e participares.",
    meetUrl: "https://meet.google.com/abc-defg-hij"
};

// Rotas de Autenticação
app.post('/api/admin/cadastrar-aluno', async (req, res) => {
    const { nome, cpf, senha } = req.body;
    if (!nome || !cpf || !senha) return res.status(400).json({ error: 'Campos obrigatórios.' });

    try {
        const resultado = await pool.query(
            'INSERT INTO alunos (nome, cpf, senha) VALUES ($1, $2, $3) RETURNING id, nome, cpf',
            [nome, cpf, senha]
        );
        return res.status(201).json({ success: true, aluno: resultado.rows[0] });
    } catch (error) {
        console.error('Erro ao cadastrar:', error);
        return res.status(500).json({ error: 'Erro interno ao salvar no banco.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { cpf, senha } = req.body;
    if (!cpf || !senha) return res.status(400).json({ error: 'Campos obrigatórios.' });

    try {
        const resultado = await pool.query(
            'SELECT id, nome, cpf FROM alunos WHERE cpf = $1 AND senha = $2',
            [cpf, senha]
        );
        if (resultado.rows.length > 0) return res.json({ success: true, aluno: resultado.rows[0] });
        return res.status(401).json({ error: 'Credenciais inválidas.' });
    } catch (error) {
        console.error('Erro no login:', error);
        return res.status(500).json({ error: 'Erro interno.' });
    }
});

// Rotas do Dashboard
app.get('/api/dashboard', (req, res) => res.json({ liveSession, courses, comics }));

app.post('/api/teacher/live', (req, res) => {
    const { isLive, title, description, meetUrl } = req.body;
    liveSession = { isLive, title, description, meetUrl };
    res.json({ success: true, liveSession });
});

app.post('/api/courses', (req, res) => {
    const { title, description, thumbnail, category } = req.body;
    const newCourse = { id: `curso_${Date.now()}`, title, description, thumbnail, category, progress: 0 };
    courses.push(newCourse);
    res.status(201).json(newCourse);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🏛️ Servidor rodando na porta ${PORT}!`));