const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

// Configuração do Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const app = express();

// Configuração do Multer para gerenciar o upload de arquivos binários em memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Configuração de CORS expandida para aceitar as novas funções de exclusão
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

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
            liveSession: liveState,
            courses: courses || [], 
            comics: comics || [] 
        });
    } catch (error) {
        console.error("💥 Erro fatal no endpoint /api/dashboard:", error.message || error);
        return res.status(500).json({ error: 'Erro ao carregar dashboard', details: error.message });
    }
});


// ==========================================
// NOVAS ROTAS ADMINISTRATIVAS (POST COM MULTER)
// ==========================================

// Atualizar Aula Ao Vivo
app.post('/api/teacher/live', (req, res) => {
    const { isLive, title, description, meetUrl } = req.body;
    liveState = { isLive, title, description, meetUrl };
    return res.json({ success: true, liveSession: liveState });
});

// Rota de Cadastro de Curso (Corrigida para coluna 'title')
app.post('/api/admin/cadastrar-curso', upload.single('capa'), async (req, res) => {
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
app.post('/api/admin/cadastrar-hq', upload.fields([
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
app.get('/api/admin/metricas', async (req, res) => {
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
app.get('/api/admin/alunos', async (req, res) => {
    const { data, error } = await supabase.from('alunos').select('nome, cpf').order('nome');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
});

// Listar Cursos Cadastrados (Corrigido para 'title')
app.get('/api/admin/cursos', async (req, res) => {
    const { data, error } = await supabase.from('cursos').select('id, title').order('title');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
});

// Listar HQs Cadastradas (Corrigido para 'title')
app.get('/api/admin/hqs', async (req, res) => {
    const { data, error } = await supabase.from('quadrinhos').select('id, title, cover').order('title');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
});

// Deleções Diretas (Corrigida para ignorar pontos e hífens)
app.delete('/api/admin/alunos/:cpf', async (req, res) => {
    try {
        // 1. Pega o CPF enviado e remove tudo que não for número (ex: 12345678900)
        const cpfLimpo = req.params.cpf.replace(/\D/g, "");

        // 2. Tenta deletar buscando pelo CPF limpo (apenas números)
        let { error } = await supabase.from('alunos').delete().eq('cpf', cpfLimpo);
        
        if (error) throw error;

        // 3. Se o seu banco usa pontos/hífen, vamos tentar deletar formatado também só por garantia
        const cpfFormatado = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        await supabase.from('alunos').delete().eq('cpf', cpfFormatado);

        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Inicialização do Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}!`);
});