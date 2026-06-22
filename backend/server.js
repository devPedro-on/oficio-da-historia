const express = require('express');
const cors = require('cors');
const app = express();

// Permite que o frontend (mesmo rodando em outra porta/origem) acesse esta API sem bloqueios de segurança
app.use(cors());
app.use(express.json());

// Base de dados simulada em memória (Posteriormente será conectada ao PostgreSQL gratuito no Supabase)
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

// Estado inicial da aula ao vivo via Google Meet (Simula o controlo do painel do teu tio)
let liveSession = {
    isLive: true,
    title: "Módulo Especial: A Invasão de Lindisfarne",
    description: "A aula ao vivo já começou no Google Meet! Clica abaixo para entrares na sala, ligares a tua câmara e participares.",
    meetUrl: "https://meet.google.com/abc-defg-hij" // Link dinâmico gerado pelo professor
};

/**
 * 1. ENDPOINT PRINCIPAL DO DASHBOARD (ALUNO)
 * Retorna o estado da live atual, a lista de cursos e as HQs disponíveis.
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
 * Permite ativar/desativar a live e atualizar o link do Google Meet em tempo real.
 */
app.post('/api/teacher/live', (req, res) => {
    const { isLive, title, description, meetUrl } = req.body;
    
    // Atualiza o estado global da sessão
    liveSession = {
        isLive: isLive !== undefined ? isLive : liveSession.isLive,
        title: title || liveSession.title,
        description: description || liveSession.description,
        meetUrl: meetUrl || liveSession.meetUrl
    };

    res.json({ 
        success: true, 
        message: "Painel de transmissão atualizado com sucesso!", 
        liveSession 
    });
});

/**
 * 3. ENDPOINT PARA ADICIONAR NOVOS CURSOS (EXTENSIBILIDADE)
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

// Configuração da porta do servidor local
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🏛️  Servidor do 'Ofício da História' a rodar com sucesso!`);
    console.log(`🔗 API disponível em: http://localhost:${PORT}/api/dashboard`);
});