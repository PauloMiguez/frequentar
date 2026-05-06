import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://frequentar-web.onrender.com/api';

const getToken = async () => {
  return await AsyncStorage.getItem('token');
};

const request = async (endpoint, options = {}) => {
  const token = await getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token && { 'Authorization': token }),
    ...options.headers
  };

  try {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_URL}${cleanEndpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers
    });

    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('Resposta do servidor inválida');
    }
    
    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

export const api = {
  // Autenticação
  login: (email, password, perfil, mac_address) => 
    request('/login-multi', {
        method: 'POST',
        body: JSON.stringify({ email, password, perfil, mac_address })
    }),
  
  // Dashboard público
  getDashboardStats: () => request('/dashboard/stats'),
  
  // Admin - Estatísticas
  getAdminStats: () => request('/admin/stats'),
  
  // Admin - Alunos
  getAlunos: () => request('/admin/alunos'),
  createAluno: (data) => request('/admin/alunos', { method: 'POST', body: JSON.stringify(data) }),
  updateAluno: (id, data) => request(`/admin/alunos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  // Admin - Professores
  getProfessores: () => request('/admin/professores'),
  createProfessor: (data) => request('/admin/professores', { method: 'POST', body: JSON.stringify(data) }),
  updateProfessor: (id, data) => request(`/admin/professores/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  // Admin - Turmas
  getTurmas: () => request('/turmas'),
  createTurma: (data) => request('/turmas', { method: 'POST', body: JSON.stringify(data) }),
  updateTurma: (id, data) => request(`/turmas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTurma: (id) => request(`/turmas/${id}`, { method: 'DELETE' }),
  
  // Admin - Pontos de Acesso
  getAPs: () => request('/admin/aps'),
  createAP: (data) => request('/admin/aps', { method: 'POST', body: JSON.stringify(data) }),
  
  // Professor
  getProfessorTurmas: () => request('/professor/turmas'),
  getTurmaAlunos: (turmaId) => request(`/professor/turmas/${turmaId}/alunos`),
  registrarPresencaProfessor: (data) => request('/professor/presenca', { method: 'POST', body: JSON.stringify(data) }),
  getProfessorStats: () => request('/professor/stats'),
  
  // Aluno
  getAlunoStats: () => request('/aluno/stats'),
  getAlunoHistorico: () => request('/aluno/historico'),
  getAlunoHorario: () => request('/aluno/horario'),
  
  // Presença Automática (Wi-Fi)
  registrarPresencaAuto: async (data) => {
    try {
      return await request('/presenca/auto', { method: 'POST', body: JSON.stringify(data) });
    } catch (error) {
      throw error;
    }
  },
  
  // Wi-Fi - Redes Autorizadas
  getRedesAutorizadas: () => request('/wifi/redes-autorizadas'),
  
  // Validar rede específica
    validarRede: (ssid, bssid) => request('/wifi/validar-rede', {
    method: 'POST',
    body: JSON.stringify({ ssid, bssid })
  }),
  
  // Perfil
  updatePerfil: (data) => request('/usuarios/perfil', { method: 'PUT', body: JSON.stringify(data) }),
  
  getPerfil: () => request('/usuarios/perfil'),
  
  // Admin - APs (update)
  updateAP: (id, data) => request(`/admin/aps/${id}`, { method: 'PUT', body: JSON.stringify(data) })
};

export default api;
