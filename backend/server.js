const express = require('express');
const cors = require('cors');
// Importa o cliente do PostgreSQL para conectar ao Supabase
const { Pool } = require('pg');

const app = express();

// Força o Node-Postgres a ignorar a verificação de certificado autoassinado globalmente
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Permite que o frontend acesse esta API sem bloqueios de segurança
app.use(cors());
app.use(express.json());

// Configuração limpa: a Render gerencia os parâmetros de SSL pela variável ambiente global
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Base de dados simulada em memória para conteúdos
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

// Estado inicial da aula ao vivo via Google Meet
let liveSession = {
    isLive: true,
    title: "Módulo Especial: A Invasão de Lindisfarne",
    description: "A aula ao vivo já começou no Google Meet! Clica abaixo para entrares na sala, ligares a tua câmara e participares.",
    meetUrl: "https://meet.google.com/abc-defg-hij"
};

/**
 * ==========================================
 * ROTAS DE AUTENTICAÇÃO E CADASTRO (SUPABASE)
 * ==========================================
 */

/**
 * ROTA NOVA: Cadastro de Alunos (Feito pelo Professor na Tela Master)
 */
app.post('/api/admin/cadastrar-aluno', async (req, res) => {
    const { nome, cpf, senha } = req.body;

    if (!nome || !cpf || !senha) {
        return res.status(400).json({ error: 'Todos os campos (nome, cpf e senha) são obrigatórios.' });
    }

    try {
        // Insere o aluno no banco real do Supabase
        const resultado = await pool.query(
            'INSERT INTO alunos (nome, cpf, senha) VALUES ($1, $2, $3) RETURNING id, nome, cpf',
            [nome, cpf, senha]
        );

        return res.status(201).json({
            success: true,
            message: 'Aluno cadastrado com sucesso!',
            aluno: resultado.rows[0]
        });

    } catch (error) {
        console.error('Erro ao cadastrar aluno:', error);
        
        // Código '23505' representa erro de chave única duplicada (CPF já existente)
        if (error.code === '23504' || error.code === '23505') {
            return res.status(400).json({ error: 'Este CPF já está cadastrado no sistema.' });
        }

        return res.status(500).json({ error: 'Erro interno ao salvar o aluno no banco.' });
    }
});

/**
 * ROTA NOVA: Login do Aluno (Validação no banco real)
 */
app.post('/api/login', async (req, res) => {
    const { cpf, senha } = req.body;

    if (!cpf || !senha) {
        return res.status(400).json({ error: 'CPF e senha são obrigatórios.' });
    }

    try {
        const resultado = await pool.query(
            'SELECT id, nome, cpf FROM alunos WHERE cpf = $1 AND senha = $2',
            [cpf, senha]
        );

        if (resultado.rows.length > 0) {
            return res.json({
                success: true,
                message: 'Login realizado com sucesso!',
                aluno: resultado.rows[0]
            });
        } else {
            return res.status(401).json({ error: 'CPF ou senha incorretos.' });
        }
    } catch (error) {
        console.error('Erro no login:', error);
        return res.status(500).json({ error: 'Erro interno ao tentar autenticar.' });
    }
});


/**
 * ==========================================
 * ROTAS DO DASHBOARD E CONTEÚDOS (EM MEMÓRIA)
 * ==========================================
 */

/**
 * 1. ENDPOINT PRINCIPAL DO DASHBOARD (ALUNO)
 */
app.get('/api/dashboard', (req, res) => {
    res.json({
        liveSession,
        courses,
        comics
    });
});

/**
 * 2. ENDPOINT DE CONTROLO DO PROFESSOR (PAINEL DO TIO)
 */
app.post('/api/teacher/live', (req, res) => {
    const { isLive, title, description, meetUrl } = req.body;
    
    liveSession = {
        isLive: isLive !== undefined ? isLive : liveSession.isLive,
        title: title || liveSession.title,
        description: description || liveSession.description,
        meetUrl: meetUrl || liveSession.meetUrl
    };

    res.json({ 
        success: true, 
        message: "Painel de transmission atualizado com sucesso!", 
        liveSession 
    });
});

/**
 * 3. ENDPOINT PARA ADICIONAR NOVOS CURSOS
 */
app.post('/api/courses', (req, res) => {
    const { title, description, thumbnail, category } = req.body;
    if (!title) return res.status(400).json({ error: "O título do curso é obrigatório." });

    const newCourse = {
        id: `curso_${Date.now()}`,
        title,
        description,
        thumbnail: thumbnail || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
        category: category || "História Geral",
        progress: 0
    };

    courses.push(newCourse);
    res.status(201).json(newCourse);
});

// Configuração dinâmica da porta (essencial para a Render)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🏛️  Servidor do 'Ofício da História' rodando com sucesso na porta ${PORT}!`);
});