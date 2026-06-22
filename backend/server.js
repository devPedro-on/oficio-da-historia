const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// CONFIGURAÇÃO COM SSL DESATIVADO PARA TESTE
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Isto diz ao Node para aceitar certificados autoassinados
    }
});

// Log para monitorar tentativas de conexão
pool.on('connect', () => console.log('✅ Conectado ao banco de dados com sucesso!'));
pool.on('error', (err) => console.error('❌ Erro no Pool:', err.message));

// Rotas
app.post('/api/admin/cadastrar-aluno', async (req, res) => {
    console.log("📥 Recebi um pedido de cadastro:", req.body);
    const { nome, cpf, senha } = req.body;
    
    if (!nome || !cpf || !senha) return res.status(400).json({ error: 'Campos obrigatórios.' });

    try {
        const resultado = await pool.query(
            'INSERT INTO alunos (nome, cpf, senha) VALUES ($1, $2, $3) RETURNING id, nome, cpf',
            [nome, cpf, senha]
        );
        return res.status(201).json({ success: true, aluno: resultado.rows[0] });
    } catch (error) {
        console.error('❌ ERRO DETALHADO NO CADASTRO:', error);
        return res.status(500).json({ error: 'Erro interno ao salvar no banco.' });
    }
});

app.post('/api/login', async (req, res) => {
    console.log("📥 Recebi um pedido de login:", req.body.cpf);
    const { cpf, senha } = req.body;

    try {
        const resultado = await pool.query(
            'SELECT id, nome, cpf FROM alunos WHERE cpf = $1 AND senha = $2',
            [cpf, senha]
        );
        if (resultado.rows.length > 0) return res.json({ success: true, aluno: resultado.rows[0] });
        return res.status(401).json({ error: 'Credenciais inválidas.' });
    } catch (error) {
        console.error('❌ ERRO DETALHADO NO LOGIN:', error);
        return res.status(500).json({ error: 'Erro interno no login.' });
    }
});

app.get('/api/dashboard', (req, res) => {
    res.json({ liveSession: { isLive: true }, courses: [], comics: [] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}!`));