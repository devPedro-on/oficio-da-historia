const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Configuração do Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ==========================================
// CONFIGURAÇÃO DE SEGURANÇA
// ==========================================
const SESSION_SECRET = process.env.SESSION_SECRET;
const TEACHER_CPF = (process.env.TEACHER_CPF || '').replace(/\D/g, '');
const TEACHER_PASSWORD_HASH = process.env.TEACHER_PASSWORD_HASH;

// Falha alto e cedo: sem essas variáveis o painel master ficaria desprotegido.
for (const [nome, valor] of Object.entries({ SESSION_SECRET, TEACHER_CPF, TEACHER_PASSWORD_HASH })) {
    if (!valor) {
        console.error(`❌ Variável de ambiente obrigatória ausente: ${nome}`);
        process.exit(1);
    }
}

// Origens autorizadas a consumir a API (o '*' anterior deixava qualquer site chamar as rotas admin)
const ALLOWED_ORIGINS = [
    'https://oficio-da-historia.vercel.app',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
];

const app = express();

// Configuração do Multer para gerenciar o upload de arquivos binários em memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors({
    origin: (origin, callback) => {
        // Requisições sem Origin (Postman, curl, health check do Render) seguem permitidas.
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        return callback(new Error('Origem não autorizada pelo CORS'));
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Middleware que exige um token de professor válido nas rotas administrativas
function requireTeacher(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Autenticação obrigatória.' });
    }

    try {
        const payload = jwt.verify(token, SESSION_SECRET);
        if (payload.role !== 'teacher') {
            return res.status(403).json({ error: 'Acesso restrito ao professor.' });
        }
        req.teacher = payload;
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }
}

// Estado temporário na memória para a Live
let liveState = {
    isLive: false,
    title: "Módulo Especial: A Invasão de Lindisfarne",
    description: "A aula ao vivo já começou no Google Meet! Clique abaixo para entrar na sala.",
    meetUrl: "https://meet.google.com/abc-defg-hij"
};

// ==========================================
// SUAS ROTAS ORIGINAIS (CORRIGIDAS PARA O SCHEMA)
// ==========================================

// Login do Professor (antes era validado no HTML, com a senha exposta no navegador)
app.post('/api/teacher/login', async (req, res) => {
    const { cpf, senha } = req.body;
    const cpfLimpo = (cpf || '').replace(/\D/g, '');

    const cpfConfere = cpfLimpo === TEACHER_CPF;
    const senhaConfere = await bcrypt.compare(senha || '', TEACHER_PASSWORD_HASH);

    if (!cpfConfere || !senhaConfere) {
        return res.status(401).json({ error: 'Acesso negado. Credenciais administrativas inválidas.' });
    }

    const token = jwt.sign({ role: 'teacher' }, SESSION_SECRET, { expiresIn: '12h' });
    return res.json({ success: true, token });
});

// Rota de Cadastro de Aluno (senha gravada com hash)
app.post('/api/admin/cadastrar-aluno', requireTeacher, async (req, res) => {
    const { nome, cpf, senha } = req.body;

    if (!nome || !cpf || !senha) {
        return res.status(400).json({ error: 'Nome, CPF e senha são obrigatórios.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const { data, error } = await supabase.from('alunos')
        .insert([{ nome, cpf: cpf.replace(/\D/g, ''), senha: senhaHash }])
        .select('id, nome, cpf');

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ success: true, aluno: data[0] });
});

// Rota de Login do Aluno
app.post('/api/login', async (req, res) => {
    const { cpf, senha } = req.body;
    const cpfLimpo = (cpf || '').replace(/\D/g, '');

    const { data: aluno, error } = await supabase.from('alunos')
        .select('id, nome, cpf, senha')
        .eq('cpf', cpfLimpo)
        .single();

    if (error || !aluno) return res.status(401).json({ error: 'Credenciais inválidas.' });

    const senhaArmazenada = aluno.senha || '';
    const pareceHash = senhaArmazenada.startsWith('$2');
    let autenticado = false;

    if (pareceHash) {
        autenticado = await bcrypt.compare(senha || '', senhaArmazenada);
    } else if (senhaArmazenada === senha) {
        // Senha antiga em texto puro: valida uma última vez e já regrava com hash.
        autenticado = true;
        const senhaHash = await bcrypt.hash(senha, 10);
        const { error: upgradeError } = await supabase.from('alunos')
            .update({ senha: senhaHash })
            .eq('id', aluno.id);
        if (upgradeError) console.error('⚠️ Falha ao migrar senha para hash:', upgradeError.message);
    }

    if (!autenticado) return res.status(401).json({ error: 'Credenciais inválidas.' });

    return res.json({ success: true, aluno: { id: aluno.id, nome: aluno.nome, cpf: aluno.cpf } });
});

// Rota de Dashboard (Carrega Cursos, Quadrinhos e Estado da Live)
app.get('/api/dashboard', async (req, res) => {
    try {
        // 1. Busca os Cursos
        const { data: courses, error: coursesError } = await supabase.from('cursos').select('*');
        if (coursesError) throw coursesError;

        // 2. Busca os Quadrinhos
        const { data: comics, error: comicsError } = await supabase.from('quadrinhos').select('*');
        if (comicsError) throw comicsError;

        // 3. Busca o estado real da live
        const { data: liveData, error: liveError } = await supabase
            .from('config_live')
            .select('*')
            .eq('id', 1)
            .single();
        
        if (!liveError && liveData) {
            liveState = {
                isLive: liveData.is_live, // Força a sincronia exata (true ou false)
                title: liveData.title,
                description: liveData.description,
                meetUrl: liveData.meet_url
            };
        }

        return res.json({
            success: true,
            liveSession: liveState, 
            courses: courses || [],
            comics: comics || []
        });
    } catch (error) {
        console.error("❌ Erro ao carregar dashboard:", error.message);
        return res.status(500).json({ error: 'Erro ao carregar dashboard' });
    }
});

// ==========================================
// NOVAS ROTAS ADMINISTRATIVAS (POST COM MULTER)
// ==========================================


// Atualizar Aula Ao Vivo (O jeito correto: Salvando na tabela configuracoes)
app.post('/api/teacher/live', requireTeacher, async (req, res) => {
    try {
        const { isLive, title, description, meetUrl } = req.body;
        const statusLive = (isLive === true || isLive === 'true');
        
        console.log(`[LIVE POST] Salvando na tabela config_live: isLive=${statusLive}`);

        const { data, error } = await supabase
            .from('config_live')
            .update({ 
                is_live: statusLive, 
                title: title || '', 
                description: description || '', 
                meet_url: meetUrl || '' 
            })
            .eq('id', 1)
            .select();

        if (error) throw error;

        liveState = { isLive: statusLive, title, description, meetUrl };
        return res.json({ success: true, liveSession: liveState });
    } catch (error) {
        console.error("[LIVE POST] Erro crítico:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Rota de Cadastro de Curso (Corrigida para coluna 'title')
app.post('/api/admin/cadastrar-curso', requireTeacher, upload.single('capa'), async (req, res) => {
    try {
        const { titulo } = req.body; 

        // Como não há coluna de imagem/cover no seu schema de cursos atualmente, salvamos apenas o title.
        // Se decidir adicionar coluna de capa depois, a lógica de upload do Multer está pronta abaixo.
        /*
        let capaUrl = "";
        if (req.file) {
            const fileExt = req.file.originalname.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            await supabase.storage.from('capas-cursos').upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
            const { data: urlData } = supabase.storage.from('capas-cursos').getPublicUrl(fileName);
            capaUrl = urlData.publicUrl;
        }
        */

        const { data, error } = await supabase
            .from('cursos')
            .insert([{ title: titulo }]) // 'title' bate com o banco
            .select();

        if (error) throw error;
        return res.status(201).json({ success: true, curso: data[0] });
    } catch (error) {
        console.error("❌ Erro ao cadastrar curso:", error);
        return res.status(500).json({ error: error.message });
    }
});

// Rota de Cadastro de HQ (Corrigida para colunas 'title' e 'cover')
app.post('/api/admin/cadastrar-hq', requireTeacher, upload.fields([
    { name: 'arquivo', maxCount: 1 },
    { name: 'capa', maxCount: 1 }
]), async (req, res) => {
    try {
        const { titulo, volume } = req.body; // Pegando título e volume do front-end
        let arquivoUrl = "";
        let capaUrl = "";

        // 1. Upload do Arquivo PDF
        if (req.files && req.files['arquivo']) {
            const arquivoFile = req.files['arquivo'][0];
            const fileName = `${Date.now()}_pdf.pdf`;

            const { error: storageError } = await supabase.storage
                .from('arquivos-hqs')
                .upload(fileName, arquivoFile.buffer, { contentType: 'application/pdf' });

            if (storageError) throw storageError;

            const { data: urlData } = supabase.storage.from('arquivos-hqs').getPublicUrl(fileName);
            arquivoUrl = urlData.publicUrl;
        }

        // 2. Upload da Imagem da Capa
        if (req.files && req.files['capa']) {
            const capaFile = req.files['capa'][0];
            const ext = capaFile.originalname.split('.').pop(); // Pega a extensão original (png, jpg, etc)
            const fileName = `${Date.now()}_capa.${ext}`;

            const { error: storageError } = await supabase.storage
                .from('arquivos-hqs') // Se tiver um bucket só para capas, mude o nome aqui
                .upload(fileName, capaFile.buffer, { contentType: capaFile.mimetype });

            if (storageError) throw storageError;

            const { data: urlData } = supabase.storage.from('arquivos-hqs').getPublicUrl(fileName);
            capaUrl = urlData.publicUrl;
        }

        // 3. Inserção no Banco de Dados
        const { data, error } = await supabase
            .from('quadrinhos')
            .insert([{ 
                title: titulo, 
                volume: volume,       
                cover: capaUrl,       
                pdf_url: arquivoUrl   
            }])
            .select();

        if (error) throw error;
        return res.status(201).json({ success: true, hq: data[0] });

    } catch (error) {
        console.error("❌ Erro ao cadastrar HQ:", error);
        return res.status(500).json({ error: error.message });
    }
});


// ==========================================
// NOVAS ROTAS DE GERENCIAMENTO (GET E DELETE)
// ==========================================

// Buscar Métricas do Dashboard Master
app.get('/api/admin/metricas', requireTeacher, async (req, res) => {
    try {
        const { count: totalAlunas } = await supabase.from('alunos').select('*', { count: 'exact', head: true });
        const { count: totalCursos } = await supabase.from('cursos').select('*', { count: 'exact', head: true });
        const { count: totalHqs } = await supabase.from('quadrinhos').select('*', { count: 'exact', head: true });
        
        return res.json({ totalAlunas: totalAlunas || 0, totalCursos: totalCursos || 0, totalHqs: totalHqs || 0 });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Listar Alunos Cadastrados
app.get('/api/admin/alunos', requireTeacher, async (req, res) => {
    const { data, error } = await supabase.from('alunos').select('id, nome, cpf').order('nome');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
});

// Listar Cursos Cadastrados (Corrigido para 'title')
app.get('/api/admin/cursos', requireTeacher, async (req, res) => {
    const { data, error } = await supabase.from('cursos').select('id, title').order('title');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
});

// Listar HQs Cadastradas (Corrigido para 'title')
app.get('/api/admin/hqs', requireTeacher, async (req, res) => {
    const { data, error } = await supabase.from('quadrinhos').select('id, title, cover').order('title');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
});

// Deleções Diretas (Corrigida para ignorar pontos e hífens)(feito)
app.delete('/api/admin/alunos/:id', requireTeacher, async (req, res) => {
    const idRecebido = req.params.id;
    try {
        console.log(` Tentando deletar aluno pelo ID único: ${idRecebido}`);

        const { data, error } = await supabase
            .from('alunos')
            .delete()
            .eq('id', idRecebido)
            .select();

        if (error) throw error;

        console.log("Resultado da deleção por ID:", data);
        return res.json({ success: true, deletado: data });
    } catch (error) {
        console.error("❌ Erro ao deletar aluno por ID:", error.message);
        return res.status(500).json({ error: error.message });
    }
});

// Deleção de Cursos
app.delete('/api/admin/cursos/:id', requireTeacher, async (req, res) => {
    const idRecebido = req.params.id;
    try {
        console.log(`Tentando deletar curso pelo ID único: ${idRecebido}`);

        const { data, error } = await supabase
            .from('cursos')
            .delete()
            .eq('id', idRecebido)
            .select();

        if (error) throw error;

        console.log("Resultado da deleção de curso:", data);
        return res.json({ success: true, deletado: data });
    } catch (error) {
        console.error("❌ Erro ao deletar curso por ID:", error.message);
        return res.status(500).json({ error: error.message });
    }
});

// Deleção de HQs (Quadrinhos)
app.delete('/api/admin/hqs/:id', requireTeacher, async (req, res) => {
    const idRecebido = req.params.id;
    try {
        console.log(`Tentando deletar HQ pelo ID único: ${idRecebido}`);

        // Usando 'quadrinhos' que é o nome real da sua tabela mapeada no banco
        const { data, error } = await supabase
            .from('quadrinhos')
            .delete()
            .eq('id', idRecebido)
            .select();

        if (error) throw error;

        console.log("Resultado da deleção de HQ:", data);
        return res.json({ success: true, deletado: data });
    } catch (error) {
        console.error("❌ Erro ao deletar HQ por ID:", error.message);
        return res.status(500).json({ error: error.message });
    }
});

// Tratador de erros: evita devolver stack trace em HTML quando o CORS recusa a origem
app.use((err, req, res, next) => {
    if (err && err.message === 'Origem não autorizada pelo CORS') {
        return res.status(403).json({ error: 'Origem não autorizada.' });
    }
    console.error('❌ Erro não tratado:', err.message);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
});

// Inicialização do Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}!`);
});