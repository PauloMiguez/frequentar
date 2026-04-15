import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function AdminScreen({ navigation }) {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    totalAlunos: 0,
    totalProfessores: 0,
    totalTurmas: 0,
    totalAPs: 0,
  });
  const [alunos, setAlunos] = useState([]);
  const [professores, setProfessores] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [aps, setAps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      loadDashboard();
      loadAlunos();
      loadProfessores();
      loadTurmas();
      loadAPs();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.nome || 'Admin');
        setUserEmail(user.email || '');
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    }
  };

  const loadDashboard = async () => {
    try {
      const data = await api.getAdminStats();
      setStats({
        totalAlunos: data.totalAlunos || 0,
        totalProfessores: data.totalProfessores || 0,
        totalTurmas: data.totalTurmas || 0,
        totalAPs: data.totalAPs || 0,
      });
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAlunos = async () => {
    try {
      const data = await api.getAlunos();
      setAlunos(data || []);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
    }
  };

  const loadProfessores = async () => {
    try {
      const data = await api.getProfessores();
      setProfessores(data || []);
    } catch (error) {
      console.error('Erro ao carregar professores:', error);
    }
  };

  const loadTurmas = async () => {
    try {
      const data = await api.getTurmas();
      setTurmas(data || []);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  const loadAPs = async () => {
    try {
      const data = await api.getAPs();
      setAps(data || []);
    } catch (error) {
      console.error('Erro ao carregar APs:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDashboard(),
      loadAlunos(),
      loadProfessores(),
      loadTurmas(),
      loadAPs(),
    ]);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        onPress: async () => {
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          navigation.replace('Login');
        },
      },
    ]);
  };

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats.totalAlunos}</Text>
        <Text style={styles.statLabel}>ALUNOS</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats.totalProfessores}</Text>
        <Text style={styles.statLabel}>PROFESSORES</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats.totalTurmas}</Text>
        <Text style={styles.statLabel}>TURMAS</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats.totalAPs}</Text>
        <Text style={styles.statLabel}>PONTOS DE ACESSO</Text>
      </View>
    </View>
  );

  const renderDashboard = () => (
    <View>
      {renderStatsCards()}
    </View>
  );

  const renderAlunos = () => (
    <View style={styles.listContainer}>
      <Text style={styles.sectionTitle}>👨‍🎓 Alunos Cadastrados</Text>
      <Text style={styles.sectionSubtitle}>Total: {alunos.length}</Text>
      {alunos.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Nenhum aluno cadastrado</Text>
        </View>
      ) : (
        alunos.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>{item.nome}</Text>
              <Text style={styles.listItemSub}>{item.email}</Text>
              <Text style={styles.listItemSub}>Matrícula: {item.matricula}</Text>
            </View>
            <Text style={styles.listItemBadge}>{item.turma_nome || 'Sem turma'}</Text>
          </View>
        ))
      )}
    </View>
  );

  const renderProfessores = () => (
    <View style={styles.listContainer}>
      <Text style={styles.sectionTitle}>👨‍🏫 Professores Cadastrados</Text>
      <Text style={styles.sectionSubtitle}>Total: {professores.length}</Text>
      {professores.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Nenhum professor cadastrado</Text>
        </View>
      ) : (
        professores.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>{item.nome}</Text>
              <Text style={styles.listItemSub}>{item.email}</Text>
              <Text style={styles.listItemSub}>Matrícula: {item.matricula}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderTurmas = () => (
    <View style={styles.listContainer}>
      <Text style={styles.sectionTitle}>📚 Turmas Cadastradas</Text>
      <Text style={styles.sectionSubtitle}>Total: {turmas.length}</Text>
      {turmas.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Nenhuma turma cadastrada</Text>
        </View>
      ) : (
        turmas.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>{item.nome}</Text>
              <Text style={styles.listItemSub}>Código: {item.codigo || '-'}</Text>
              <Text style={styles.listItemSub}>Horário: {item.horario_inicio} - {item.horario_fim}</Text>
            </View>
            <Text style={styles.listItemBadge}>{item.professor_nome || 'Sem professor'}</Text>
          </View>
        ))
      )}
    </View>
  );

  const renderAPs = () => (
    <View style={styles.listContainer}>
      <Text style={styles.sectionTitle}>📡 Pontos de Acesso</Text>
      <Text style={styles.sectionSubtitle}>Total: {aps.length}</Text>
      {aps.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Nenhum ponto de acesso cadastrado</Text>
        </View>
      ) : (
        aps.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>{item.ssid}</Text>
              <Text style={styles.listItemSub}>BSSID: {item.bssid}</Text>
              <Text style={styles.listItemSub}>Local: {item.predio} - {item.sala}</Text>
            </View>
            <Text style={[styles.listItemBadge, item.ativo ? styles.activeBadge : styles.inactiveBadge]}>
              {item.ativo ? 'Ativo' : 'Inativo'}
            </Text>
          </View>
        ))
      )}
    </View>
  );

  const renderConfiguracoes = () => (
    <View style={styles.configContainer}>
      <Text style={styles.sectionTitle}>⚙️ Configurações</Text>
      <View style={styles.configCard}>
        <Text style={styles.configLabel}>Versão do App</Text>
        <Text style={styles.configValue}>1.0.0</Text>
      </View>
      <View style={styles.configCard}>
        <Text style={styles.configLabel}>Administrador</Text>
        <Text style={styles.configValue}>{userName}</Text>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a2b4e" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a2b4e" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Frequentar</Text>
          <Text style={styles.headerSubtitle}>Admin, {userName}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
          <Text style={styles.logoutIconText}>🚪</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'dashboard' && styles.activeTab]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'alunos' && styles.activeTab]}
          onPress={() => setActiveTab('alunos')}
        >
          <Text style={[styles.tabText, activeTab === 'alunos' && styles.activeTabText]}>Alunos</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'professores' && styles.activeTab]}
          onPress={() => setActiveTab('professores')}
        >
          <Text style={[styles.tabText, activeTab === 'professores' && styles.activeTabText]}>Professores</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'turmas' && styles.activeTab]}
          onPress={() => setActiveTab('turmas')}
        >
          <Text style={[styles.tabText, activeTab === 'turmas' && styles.activeTabText]}>Turmas</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'aps' && styles.activeTab]}
          onPress={() => setActiveTab('aps')}
        >
          <Text style={[styles.tabText, activeTab === 'aps' && styles.activeTabText]}>APs</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'configuracoes' && styles.activeTab]}
          onPress={() => setActiveTab('configuracoes')}
        >
          <Text style={[styles.tabText, activeTab === 'configuracoes' && styles.activeTabText]}>Config</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'alunos' && renderAlunos()}
        {activeTab === 'professores' && renderProfessores()}
        {activeTab === 'turmas' && renderTurmas()}
        {activeTab === 'aps' && renderAPs()}
        {activeTab === 'configuracoes' && renderConfiguracoes()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { backgroundColor: '#0a2b4e', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  logoutIcon: { padding: 8 },
  logoutIconText: { fontSize: 24 },
  tabBar: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', paddingVertical: 10, elevation: 2 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 2 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#0a2b4e' },
  tabText: { fontSize: 12, color: '#666' },
  activeTabText: { color: '#0a2b4e', fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 32, fontWeight: 'bold', color: '#0a2b4e' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4, fontWeight: '500' },
  listContainer: { flex: 1, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  listItem: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
  listItemContent: { flex: 1 },
  listItemTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  listItemSub: { fontSize: 12, color: '#666', marginTop: 2 },
  listItemBadge: { fontSize: 11, color: '#0a2b4e', backgroundColor: '#e8f4f8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, fontWeight: 'bold' },
  activeBadge: { color: '#4CAF50', backgroundColor: '#e8f5e9' },
  inactiveBadge: { color: '#F44336', backgroundColor: '#ffebee' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 30, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#999' },
  configContainer: { flex: 1 },
  configCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  configLabel: { fontSize: 14, color: '#666' },
  configValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  logoutButton: { backgroundColor: '#F44336', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
