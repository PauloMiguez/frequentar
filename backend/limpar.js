const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database('./presenca.db');

console.log('📊 Conectado ao banco de dados\n');

// Mostrar registros antes
db.get("SELECT COUNT(*) as total FROM registros_presenca", (err, result) => {
  console.log(`📝 Registros de presença atuais: ${result.total}`);
});

db.get("SELECT COUNT(*) as total FROM registros_manuais", (err, result) => {
  console.log(`📝 Registros manuais atuais: ${result.total}`);
});

// Menu interativo
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n=== MENU DE LIMPEZA ===');
console.log('1 - Limpar todos os registros de presença');
console.log('2 - Limpar registros manuais');
console.log('3 - Limpar TUDO (presença + manuais)');
console.log('4 - Limpar registros de uma data específica');
console.log('5 - Sair\n');

rl.question('Escolha uma opção: ', (opcao) => {
  switch(opcao) {
    case '1':
      db.run('DELETE FROM registros_presenca', function(err) {
        if (err) console.error('❌ Erro:', err.message);
        else console.log(`✅ ${this.changes} registros de presença removidos`);
        rl.close();
        db.close();
      });
      break;
      
    case '2':
      db.run('DELETE FROM registros_manuais', function(err) {
        if (err) console.error('❌ Erro:', err.message);
        else console.log(`✅ ${this.changes} registros manuais removidos`);
        rl.close();
        db.close();
      });
      break;
      
    case '3':
      db.run('DELETE FROM registros_presenca', function(err) {
        if (err) console.error('❌ Erro:', err.message);
        else console.log(`✅ ${this.changes} registros de presença removidos`);
      });
      db.run('DELETE FROM registros_manuais', function(err) {
        if (err) console.error('❌ Erro:', err.message);
        else console.log(`✅ ${this.changes} registros manuais removidos`);
        setTimeout(() => {
          rl.close();
          db.close();
        }, 500);
      });
      break;
      
    case '4':
      rl.question('Digite a data (YYYY-MM-DD): ', (data) => {
        db.run('DELETE FROM registros_presenca WHERE data_conexao = ?', [data], function(err) {
          if (err) console.error('❌ Erro:', err.message);
          else console.log(`✅ ${this.changes} registros de ${data} removidos`);
          rl.close();
          db.close();
        });
      });
      break;
      
    default:
      console.log('Saindo...');
      rl.close();
      db.close();
  }
});