const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./presenca.db');

const deviceIdCorreto = 'id-1775155365069-d5j14sjbnrs';
const matricula = '001';

console.log('í´„ Atualizando Device ID...');

db.run('UPDATE dispositivos SET mac_address = ? WHERE matricula = ?', 
       [deviceIdCorreto, matricula], 
       function(err) {
  if (err) {
    console.log('âŒ Erro:', err.message);
  } else {
    console.log(`âœ… Device ID atualizado! (${this.changes} registro modificado)`);
  }
  
  // Verificar o resultado
  db.get('SELECT * FROM dispositivos WHERE matricula = ?', [matricula], (err, row) => {
    if (row) {
      console.log('\ní³± Dispositivo atualizado:');
      console.log(`   Nome: ${row.nome_aluno}`);
      console.log(`   MatrÃ­cula: ${row.matricula}`);
      console.log(`   Device ID: ${row.mac_address}`);
    }
    db.close();
  });
});
