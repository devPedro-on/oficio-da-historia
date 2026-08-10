// Gera o hash da senha do professor para colar na variável TEACHER_PASSWORD_HASH do Render.
// Uso: node gerar-hash.js "sua-senha-aqui"

const bcrypt = require('bcryptjs');

const senha = process.argv[2];

if (!senha) {
    console.error('\n❌ Informe a senha. Exemplo:\n   node gerar-hash.js "minha-senha-secreta"\n');
    process.exit(1);
}

if (senha.length < 8) {
    console.error('\n❌ Use uma senha de pelo menos 8 caracteres.\n');
    process.exit(1);
}

const hash = bcrypt.hashSync(senha, 10);

console.log('\n✅ Hash gerado. Cole o valor abaixo na variável TEACHER_PASSWORD_HASH do Render:\n');
console.log(hash);
console.log('\n⚠️  Não versione esse hash no Git nem compartilhe a senha original.\n');
