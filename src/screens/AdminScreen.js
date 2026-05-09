import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { colors, globalStyles } from '../styles/globalStyles';
import Header from '../components/Header';
import TabBar from '../components/TabBar';
import StatCard from '../components/StatCard';

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
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const tabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'alunos', label: 'Alunos' },
    { key: 'professores', label: 'Professores' },
    { key: 'turmas', label: 'Turmas' },
    { key: 'aps', label: 'APs' },
    { key: 'configuracoes', label: 'Config' },
  ];

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
    } catch (error) {}
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
    } catch (error) {} finally {
      setLoading(false);
    }
  };

  const loadAlunos = async () => {
    try {
      const data = await api.getAlunos();
      setAlunos(data || []);
    } catch (error) {}
  };

  const loadProfessores = async () => {
    try {
      const data = await api.getProfessores();
      setProfessores(data || []);
    } catch (error) {}
  };

  const loadTurmas = async () => {
    try {
      const data = await api.getTurmas();
      setTurmas(data || []);
    } catch (error) {}
  };

  const loadAPs = async () => {
    try {
      const data = await api.getAPs();
      setAps(data || []);
    } catch (error) {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboard(), loadAlunos(), loadProfessores(), loadTurmas(), loadAPs()]);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', onPress: async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        navigation.replace('Login');
      }}
    ]);
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    setFormData(item || { ativo: 1 });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      if (editingItem) {
        if (modalType === 'aluno') {
          await api.updateAluno(editingItem.id, formData);
          setAlunos(prev => prev.map(a => a.id === editingItem.id ? { ...a, ...formData } : a));
        } else if (modalType === 'professor') {
          await api.updateProfessor(editingItem.id, formData);
          setProfessores(prev => prev.map(p => p.id === editingItem.id ? { ...p, ...formData } : p));
        } else if (modalType === 'ap') {
          await api.updateAP(editingItem.id, formData);
          setAps(prev => prev.map(a => a.id === editingItem.id ? { ...a, ...formData } : a));
        }
        Alert.alert('Sucesso', 'Registro atualizado!');
      }
      setModalVisible(false);
      await loadDashboard();
    } catch (error) {
      Alert.alert('Erro', error.message);
    }
  };

  const renderModal = () => {
    if (!modalVisible) return null;
    const isEditing = !!editingItem;
    
    return (
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={globalStyles.modalOverlay}>
          <View style={globalStyles.modalContent}>
            <Text style={globalStyles.modalTitle}>{isEditing ? 'Editar' : 'Novo'} {modalType}</Text>
            
            {modalType === 'aluno' && (
              <>
                <TextInput style={globalStyles.input} placeholder="Nome" value={formData.nome || ''} onChangeText={(t) => setFormData({...formData, nome: t})} />
                <TextInput style={globalStyles.input} placeholder="Email" value={formData.email || ''} onChangeText={(t) => setFormData({...formData, email: t})} />
                <TextInput style={globalStyles.input} placeholder="Matrícula" value={formData.matricula || ''} onChangeText={(t) => setFormData({...formData, matricula: t})} />
                {isEditing && (
                  <View style={globalStyles.switchContainer}>
                    <Text style={globalStyles.switchLabel}>Ativo</Text>
                    <Switch value={formData.ativo === 1} onValueChange={(v) => setFormData({...formData, ativo: v ? 1 : 0})} />
                  </View>
                )}
              </>
            )}
            
            {(modalType === 'professor' || modalType === 'ap') && (
              <>
                <TextInput style={globalStyles.input} placeholder="Nome" value={formData.nome || formData.ssid || ''} onChangeText={(t) => setFormData({...formData, [modalType === 'professor' ? 'nome' : 'ssid']: t})} />
                <TextInput style={globalStyles.input} placeholder="Email" value={formData.email || ''} onChangeText={(t) => setFormData({...formData, email: t})} />
                <TextInput style={globalStyles.input} placeholder="Matrícula/BSSID" value={formData.matricula || formData.bssid || ''} onChangeText={(t) => setFormData({...formData, [modalType === 'professor' ? 'matricula' : 'bssid']: t})} />
                {isEditing && (
                  <View style={globalStyles.switchContainer}>
                    <Text style={globalStyles.switchLabel}>Ativo</Text>
                    <Switch value={formData.ativo === 1} onValueChange={(v) => setFormData({...formData, ativo: v ? 1 : 0})} />
                  </View>
                )}
              </>
            )}
            
            <View style={globalStyles.modalButtons}>
              <TouchableOpacity style={globalStyles.modalButtonCancel} onPress={() => setModalVisible(false)}>
                <Text style={globalStyles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={globalStyles.modalButtonSave} onPress={handleSave}>
                <Text style={globalStyles.modalButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderDashboard = () => (
    <View>
      <View style={globalStyles.statsContainer}>
        <StatCard value={stats.totalAlunos} label="ALUNOS" onPress={() => setActiveTab('alunos')} />
        <StatCard value={stats.totalProfessores} label="PROFESSORES" onPress={() => setActiveTab('professores')} />
      </View>
      <View style={globalStyles.statsContainer}>
        <StatCard value={stats.totalTurmas} label="TURMAS" onPress={() => setActiveTab('turmas')} />
        <StatCard value={stats.totalAPs} label="PONTOS DE ACESSO" onPress={() => setActiveTab('aps')} />
      </View>
    </View>
  );

  const renderList = (items, type, renderItem) => (
    <View style={globalStyles.listContainer}>
      <View style={globalStyles.listHeader}>
        <Text style={globalStyles.sectionTitle}>{type}</Text>
        <TouchableOpacity style={globalStyles.addButton} onPress={() => openModal(type.toLowerCase())}>
          <Text style={globalStyles.addButtonText}>+ Adicionar</Text>
        </TouchableOpacity>
      </View>
      {items.length === 0 ? (
        <View style={globalStyles.emptyCard}>
          <Text style={globalStyles.emptyText}>Nenhum {type.toLowerCase()} cadastrado</Text>
        </View>
      ) : (
        items.map(renderItem)
      )}
    </View>
  );

  const renderConfiguracoes = () => (
    <View>
      <Text style={globalStyles.sectionTitle}>⚙️ Configurações</Text>
      <View style={globalStyles.configCard}>
        <Text style={globalStyles.configLabel}>Versão do App</Text>
        <Text style={globalStyles.configValue}>1.0.0</Text>
      </View>
      <View style={globalStyles.configCard}>
        <Text style={globalStyles.configLabel}>Administrador</Text>
        <Text style={globalStyles.configValue}>{userName}</Text>
      </View>
      <TouchableOpacity style={globalStyles.logoutButton} onPress={handleLogout}>
        <Text style={globalStyles.logoutButtonText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={globalStyles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={globalStyles.loadingText}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <Header title="Frequentar" subtitle={`Admin, ${userName}`} onLogout={handleLogout} />
      
      <TabBar tabs={tabs} activeTab={activeTab} onTabPress={setActiveTab} />
      
      <ScrollView style={globalStyles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'alunos' && renderList(alunos, 'Alunos', (item) => (
          <View key={item.id} style={globalStyles.listItem}>
            <View style={globalStyles.listItemContent}>
              <Text style={globalStyles.listItemTitle}>{item.nome}</Text>
              <Text style={globalStyles.listItemSub}>{item.email}</Text>
              <Text style={globalStyles.listItemSub}>Matrícula: {item.matricula}</Text>
            </View>
            <TouchableOpacity onPress={() => openModal('aluno', item)}>
              <Text style={globalStyles.listItemBadge}>✏️</Text>
            </TouchableOpacity>
          </View>
        ))}
        {activeTab === 'professores' && renderList(professores, 'Professores', (item) => (
          <View key={item.id} style={globalStyles.listItem}>
            <View style={globalStyles.listItemContent}>
              <Text style={globalStyles.listItemTitle}>{item.nome}</Text>
              <Text style={globalStyles.listItemSub}>{item.email}</Text>
              <Text style={globalStyles.listItemSub}>Matrícula: {item.matricula}</Text>
            </View>
            <TouchableOpacity onPress={() => openModal('professor', item)}>
              <Text style={globalStyles.listItemBadge}>✏️</Text>
            </TouchableOpacity>
          </View>
        ))}
        {activeTab === 'turmas' && renderList(turmas, 'Turmas', (item) => (
          <View key={item.id} style={globalStyles.listItem}>
            <View style={globalStyles.listItemContent}>
              <Text style={globalStyles.listItemTitle}>{item.nome}</Text>
              <Text style={globalStyles.listItemSub}>Código: {item.codigo}</Text>
              <Text style={globalStyles.listItemSub}>Professor: {item.professor_nome || 'Não vinculado'}</Text>
            </View>
          </View>
        ))}
        {activeTab === 'aps' && renderList(aps, 'APs', (item) => (
          <View key={item.id} style={globalStyles.listItem}>
            <View style={globalStyles.listItemContent}>
              <Text style={globalStyles.listItemTitle}>{item.ssid}</Text>
              <Text style={globalStyles.listItemSub}>BSSID: {item.bssid}</Text>
              <Text style={globalStyles.listItemSub}>Local: {item.predio} - {item.sala}</Text>
            </View>
            <TouchableOpacity onPress={() => openModal('ap', item)}>
              <Text style={globalStyles.listItemBadge}>✏️</Text>
            </TouchableOpacity>
          </View>
        ))}
        {activeTab === 'configuracoes' && renderConfiguracoes()}
      </ScrollView>
      
      {renderModal()}
    </SafeAreaView>
  );
}
