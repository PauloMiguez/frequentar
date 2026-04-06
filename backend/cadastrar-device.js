const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./presenca.db');

const deviceId = 'id-1775155365069-d5j14sjbnrs';

// Verificar se já existe
db.get('SELECT * FROM dispositivos WHERE mac_address = ?', [deviceId], (err, row) => {
  if (row) {
    console.log('⚠️ Device ID já está cadastrado!');
    console.log('   Nome:', row.nome_aluno);
    console.log('   Matrícula:', row.matricula);
    db.close();
    return;
  }
  
  // Cadastrar novo dispositivo
  db.run(`INSERT INTO dispositivos (nome_aluno, matricula, mac_address) 
          VALUES (?, ?, ?)`, 
          ['Meu Celular', '001', deviceId], 
          function(err) {
    if (err) {
      console.log('❌ Erro:', err.message);
    } else {
      console.log(`✅ Device ID cadastrado com sucesso! ID: ${this.lastID}`);
    }
    
    // Listar todos os dispositivos
    db.all('SELECT * FROM dispositivos', (err, rows) => {
      console.log('\n��� Dispositivos cadastrados:');
      rows.forEach(row => {
        console.log(`   ${row.id} - ${row.nome_aluno} (${row.matricula}) -> ${row.mac_address}`);
      });
      db.close();
    });
  });
});
