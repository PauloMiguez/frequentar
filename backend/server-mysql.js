const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configuração do MySQL
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'sua_senha',
  database: 'presenca_wifi',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware de autenticação
const authMiddleware = async (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  
  jwt.verify(token, 'secret_key_2024', (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Token inválido' });
    req.adminId = decoded.id;
    next();
  });
};

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const [rows] = await pool.query('SELECT * FROM administradores WHERE username = ?', [username]);
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const admin = rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const token = jwt.sign({ id: admin.id, username: admin.username }, 'secret_key_2024', { expiresIn: '24h' });
    res.json({ token, admin: { id: admin.id, username: admin.username, nome: admin.nome_completo } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Configuração Wi-Fi
app.post('/api/wifi/config', authMiddleware, async (req, res) => {
  const { ssid, password } = req.body;
  
  try {
    await pool.query('DELETE FROM wifi_config');
    const [result] = await pool.query('INSERT INTO wifi_config (ssid, password) VALUES (?, ?)', [ssid, password]);
    res.json({ id: result.insertId, ssid, message: 'Wi-Fi configurado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/wifi/config', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM wifi_config ORDER BY id DESC LIMIT 1');
    res.json(rows[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dispositivos
app.post('/api/dispositivos', authMiddleware, async (req, res) => {
  const { nome_aluno, matricula, mac_address } = req.body;
  
  try {
    const [result] = await pool.query(
      'INSERT INTO dispositivos (nome_aluno, matricula, mac_address) VALUES (?, ?, ?)',
      [nome_aluno, matricula, mac_address]
    );
    res.json({ id: result.insertId, nome_aluno, matricula, mac_address });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dispositivos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM dispositivos WHERE ativo = 1 ORDER BY nome_aluno');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/dispositivos/:id', authMiddleware, async (req, res) => {
  const { nome_aluno, matricula, mac_address } = req.body;
  const { id } = req.params;
  
  try {
    await pool.query(
      'UPDATE dispositivos SET nome_aluno = ?, matricula = ?, mac_address = ? WHERE id = ?',
      [nome_aluno, matricula, mac_address, id]
    );
    res.json({ message: 'Dispositivo atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/dispositivos/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.query('UPDATE dispositivos SET ativo = 0 WHERE id = ?', [id]);
    res.json({ message: 'Dispositivo excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar presença via Wi-Fi
app.post('/api/presenca/wifi', async (req, res) => {
  const { mac_address, tempo_conectado } = req.body;
  const hoje = new Date().toISOString().split('T')[0];
  const agora = new Date().toTimeString().split(' ')[0];
  
  try {
    const [dispositivos] = await pool.query('SELECT id FROM dispositivos WHERE mac_address = ? AND ativo = 1', [mac_address]);
    
    if (dispositivos.length === 0) {
      return res.status(404).json({ error: 'Dispositivo não cadastrado' });
    }
    
    const dispositivo = dispositivos[0];
    
    const [existentes] = await pool.query(
      'SELECT id FROM registros_presenca WHERE dispositivo_id = ? AND data_conexao = ?',
      [dispositivo.id, hoje]
    );
    
    if (existentes.length > 0) {
      return res.json({ message: 'Presença já registrada hoje', status: 'duplicado' });
    }
    
    const [result] = await pool.query(
      'INSERT INTO registros_presenca (dispositivo_id, data_conexao, hora_conexao, tempo_conectado) VALUES (?, ?, ?, ?)',
      [dispositivo.id, hoje, agora, tempo_conectado || 0]
    );
    
    res.json({ id: result.insertId, message: 'Presença registrada com sucesso', status: 'registrado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registro manual
app.post('/api/presenca/manual', authMiddleware, async (req, res) => {
  const { nome_aluno, matricula, motivo } = req.body;
  const hoje = new Date().toISOString().split('T')[0];
  const agora = new Date().toTimeString().split(' ')[0];
  
  try {
    const [admins] = await pool.query('SELECT nome_completo FROM administradores WHERE id = ?', [req.adminId]);
    const adminNome = admins[0]?.nome_completo || 'Admin';
    
    const [result] = await pool.query(
      'INSERT INTO registros_manuais (nome_aluno, matricula, data_registro, hora_registro, admin_nome, motivo) VALUES (?, ?, ?, ?, ?, ?)',
      [nome_aluno, matricula, hoje, agora, adminNome, motivo || 'Registro manual']
    );
    
    res.json({ id: result.insertId, message: 'Presença registrada manualmente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Relatórios
app.get('/api/relatorio/presencas', async (req, res) => {
  const { data_inicio, data_fim } = req.query;
  
  let query = `
    SELECT d.nome_aluno, d.matricula, rp.data_conexao, rp.hora_conexao, rp.tempo_conectado
    FROM registros_presenca rp
    JOIN dispositivos d ON d.id = rp.dispositivo_id
  `;
  
  const params = [];
  if (data_inicio && data_fim) {
    query += ` WHERE rp.data_conexao BETWEEN ? AND ?`;
    params.push(data_inicio, data_fim);
  }
  
  query += ` ORDER BY rp.data_conexao DESC, rp.hora_conexao DESC`;
  
  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
  const hoje = new Date().toISOString().split('T')[0];
  
  try {
    const [totalDispositivos] = await pool.query('SELECT COUNT(*) as total FROM dispositivos WHERE ativo = 1');
    const [presentesHoje] = await pool.query('SELECT COUNT(*) as total FROM registros_presenca WHERE data_conexao = ?', [hoje]);
    const [manuaisHoje] = await pool.query('SELECT COUNT(*) as total FROM registros_manuais WHERE data_registro = ?', [hoje]);
    
    res.json({
      total_dispositivos: totalDispositivos[0]?.total || 0,
      presentes_hoje: presentesHoje[0]?.total || 0,
      registros_manuais_hoje: manuaisHoje[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT} (MySQL)`);
});
