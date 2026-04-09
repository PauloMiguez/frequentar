import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
  SafeAreaView,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function ProfessorScreen({ navigation }) {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [turmas, setTurmas] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [alunos, setAlunos] = useState([]);
  const [presencas, setPresencas] = useState({});

  useEffect(() => {
    loadUserData();
    loadData();
  }, []);

  const loadUserData = async () => {
    const usuario = await AsyncStorage.getItem('usuario');
    if (usuario) {
      const user = JSON.parse(usuario);
      setUserName(user.nome);
      setUserEmail(user.email);
    }
  };

  const loadData = async () => {
    try {
      const [statsData, turmasData] = await Promise.all([
        api.getProfessorStats(),
        api.getProfessorTurmas()
      ]);
      setStats(statsData);
      setTurmas(turmasData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('usuario');
    navigation.replace('Login');
  };

  const openRegistrarPresenca = async (turma) => {
    setSelectedTurma(turma);
    setLoading(true);
    try {
      const alunosData = await api.getTurmaAlunos(turma.id);
      setAlunos(alunosData);
      const initialPresencas = {};
      alunosData.forEach(aluno => {
        initialPresencas[aluno.id] = 'presente';
      });
      setPresencas(initialPresencas);
      setModalVisible(true);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os alunos');
    } finally {
      setLoading(false);
    }
  };

  const salvarPresencas = async () => {
    const presencasList = Object.entries(presencas).map(([alunoId, status]) => ({
      aluno_id: parseInt(alunoId),
      status
    }));
    
    setLoading(true);
    try {
      await api.registrarPresencaProfessor({
        turma_id: selectedTurma.id,
        presencas: presencasList
      });
      Alert.alert('Sucesso', 'Presenças registradas!');
      setModalVisible(false);
      await loadData();
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePresenca = (alunoId, status) => {
    setPresencas(prev => ({ ...prev, [alunoId]: status }));
  };

  const renderDashboard = () => (
    <View>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalTurmas || 0}</Text>
          <Text style={styles.statLabel}>Turmas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalAlunos || 0}</Text>
          <Text style={styles.statLabel}>Alunos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.presentesHoje || 0}</Text>
          <Text style={styles.statLabel}>Presentes Hoje</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Minhas Turmas</Text>
        {turmas.map(turma => (
          <View key={turma.id} style={styles.turmaCard}>
            <Text style={styles.turmaNome}>{turma.nome}</Text>
            <Text style={styles.turmaInfo}>Código: {turma.codigo}</Text>
            <Text style={styles.turmaInfo}>Alunos: {turma.totalAlunos || 0}</Text>
            <TouchableOpacity
              style={styles.registrarButton}
              onPress={() => openRegistrarPresenca(turma)}
            >
              <Text style={styles.registrarButtonText}>Registrar Presença</Text>
            </TouchableOpacity>
          </View>
        ))}
        {turmas.length === 0 && <Text style={styles.emptyText}>Nenhuma turma atribuída</Text>}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0a2b4e" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Frequentar - Professor</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logout}>Sair</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {renderDashboard()}
        </ScrollView>

        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Registrar Presença</Text>
              <Text style={styles.modalSubtitle}>Turma: {selectedTurma?.nome}</Text>
              
              <FlatList
                data={alunos}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.alunoRow}>
                    <View style={styles.alunoInfo}>
                      <Text style={styles.alunoNome}>{item.nome}</Text>
                      <Text style={styles.alunoMatricula}>{item.matricula}</Text>
                    </View>
                    <View style={styles.statusButtons}>
                      <TouchableOpacity
                        style={[styles.statusButton, presencas[item.id] === 'presente' && styles.statusActive]}
                        onPress={() => updatePresenca(item.id, 'presente')}
                      >
                        <Text style={styles.statusButtonText}>P</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.statusButton, presencas[item.id] === 'ausente' && styles.statusActive]}
                        onPress={() => updatePresenca(item.id, 'ausente')}
                      >
                        <Text style={styles.statusButtonText}>A</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.statusButton, presencas[item.id] === 'justificado' && styles.statusActive]}
                        onPress={() => updatePresenca(item.id, 'justificado')}
                      >
                        <Text style={styles.statusButtonText}>J</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>Nenhum aluno na turma</Text>}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButtonSave} onPress={salvarPresencas} disabled={loading}>
                  <Text style={styles.modalButtonText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a2b4e' },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#0a2b4e' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  logout: { color: '#c5a028', fontSize: 16 },
  userInfo: { backgroundColor: 'white', padding: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  userEmail: { fontSize: 14, color: '#666', marginTop: 4 },
  content: { flex: 1, padding: 15 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statCard: { flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 12, alignItems: 'center', elevation: 2, marginHorizontal: 5 },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#0a2b4e' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 5 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  turmaCard: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 15, marginBottom: 10 },
  turmaNome: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  turmaInfo: { fontSize: 12, color: '#666', marginTop: 4 },
  registrarButton: { backgroundColor: '#c5a028', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  registrarButtonText: { color: 'white', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#999', padding: 20 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 12, padding: 20, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  alunoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 12 },
  alunoInfo: { flex: 2 },
  alunoNome: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  alunoMatricula: { fontSize: 12, color: '#666', marginTop: 2 },
  statusButtons: { flexDirection: 'row', gap: 8 },
  statusButton: { width: 40, paddingVertical: 8, backgroundColor: '#e5e7eb', borderRadius: 8, alignItems: 'center' },
  statusActive: { backgroundColor: '#c5a028' },
  statusButtonText: { fontSize: 14, color: '#333', fontWeight: '500' },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalButtonCancel: { flex: 1, backgroundColor: '#999', padding: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonSave: { flex: 1, backgroundColor: '#c5a028', padding: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { color: 'white', fontWeight: 'bold' }
});
