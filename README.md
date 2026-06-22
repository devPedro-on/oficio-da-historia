# 🏛️ Ofício da História

Plataforma de ensino imersiva projetada para distribuição de cursos, leitura de quadrinhos históricos e integração de aulas ao vivo via Google Meet. O projeto foi estruturado com foco em altíssimo desempenho, consumo zero de processamento de infraestrutura (custo zero) e portabilidade como um aplicativo instalável (**PWA**).

---

## 🛠️ Tecnologias e Arquitetura

O ecossistema é dividido de forma isolada em duas camadas de engenharia:

* **Backend:** API REST construída em Node.js com o framework Express, gerenciando rotas dinâmicas de conteúdo e estados de transmissão com suporte a CORS.
* **Frontend:** Interface de usuário premium responsiva estilizada via Tailwind CSS, com injeção assíncrona de dados (`fetch API`) e suporte a Progressive Web App (PWA) usando Service Workers (`sw.js`) e Manifestos de instalação móvel.

---

## 🚀 Como Rodar o Projeto no Ambiente Local (WSL Ubuntu)

Siga a ordem dos blocos abaixo no terminal do seu ambiente Linux:

### 1. Inicializando o Backend
Navegue até a pasta do backend, garanta que as dependências estão atualizadas no ecossistema e ligue o servidor:

```bash
# Entrar no diretório do backend
cd ~/projetos/oficio-da-historia/backend

# Garantir a instalação limpa dos pacotes
npm install

# Iniciar o servidor da API
npm start

*O terminal deverá retornar:* `🏛️ Servidor do 'Ofício da História' a rodar com sucesso!`  
*A API estará respondendo localmente em:* `http://localhost:3000/api/dashboard`

### 2. Inicializando o Frontend
Com o backend rodando em um terminal, abra uma nova aba ou use um servidor estático para abrir a interface:

Se estiver usando a extensão **Live Server** no VS Code:
1. Clique com o botão direito no arquivo `frontend/index.html`.
2. Selecione **"Open with Live Server"**.

Caso prefira rodar um servidor estático via terminal Node:

```bash
# Entrar no diretório do frontend
cd ~/projetos/oficio-da-historia/frontend

# Rodar o servidor estático temporário
npx serve .


