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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { colors, globalStyles } from '../styles/globalStyles';
import Header from '../components/Header';
import TabBar from '../components/TabBar';
import StatCard from '../components/StatCard';

export default function ProfessorScreen({ navigation }) {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ totalTurmas: 0, totalAlunos: 0, presentesHoje: 0 });
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'turmas', label: 'Minhas Turmas' },
    { key: 'presenca', label: 'Registrar Presença' },
    { key: 'configuracoes', label: 'Configurações' },
  ];

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      loadStats();
      loadTurmas();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.nome || 'Professor');
        setUserEmail(user.email || '');
      }
    } catch (error) {}
  };

  const loadStats = async () => {
    try {
      const data = await api.getProfessorStats();
      setStats(data);
    } catch (error) {} finally {
      setLoading(false);
    }
  };

  const loadTurmas = async () => {
    try {
      const data = await api.getProfessorTurmas();
      setTurmas(data || []);
    } catch (error) {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadTurmas()]);
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

  const renderDashboard = () => (
    <View>
      <View style={globalStyles.statsContainer}>
        <StatCard value={stats.totalTurmas} label="MINHAS TURMAS" onPress={() => setActiveTab('turmas')} />
        <StatCard value={stats.totalAlunos} label="TOTAL ALUNOS" />
      </View>
      <View style={globalStyles.statsContainer}>
        <StatCard value={stats.presentesHoje} label="PRESENTES HOJE" color={colors.success} />
      </View>
      
      <View style={globalStyles.infoCard}>
        <Text style={globalStyles.infoTitle}>📋 Ações Rápidas</Text>
        <TouchableOpacity style={globalStyles.addButton} onPress={() => setActiveTab('presenca')}>
          <Text style={globalStyles.addButtonText}>Registrar Presença</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTurmas = () => (
    <View>
      <Text style={globalStyles.sectionTitle}>📚 Minhas Turmas</Text>
      {turmas.length === 0 ? (
        <View style={globalStyles.emptyCard}>
          <Text style={globalStyles.emptyText}>Nenhuma turma vinculada</Text>
        </View>
      ) : (
        turmas.map((item) => (
          <View key={item.id} style={globalStyles.listItem}>
            <View style={globalStyles.listItemContent}>
              <Text style={globalStyles.listItemTitle}>{item.nome}</Text>
              <Text style={globalStyles.listItemSub}>Código: {item.codigo}</Text>
              <Text style={globalStyles.listItemSub}>Alunos: {item.totalAlunos || 0}</Text>
              <Text style={globalStyles.listItemSub}>Horário: {item.horario_inicio?.substring(0,5)} - {item.horario_fim?.substring(0,5)}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderPresenca = () => (
    <View>
      <Text style={globalStyles.sectionTitle}>✅ Registrar Presença</Text>
      <View style={globalStyles.infoCard}>
        <Text style={globalStyles.infoText}>Selecione uma turma para registrar presença manualmente</Text>
        {turmas.length === 0 ? (
          <Text style={globalStyles.emptyText}>Nenhuma turma disponível</Text>
        ) : (
          turmas.map((item) => (
            <TouchableOpacity 
              key={item.id}
              style={[globalStyles.listItem, { marginTop: 10 }]}
              onPress={() => Alert.alert('Registrar Presença', `Registrar presença para ${item.nome}?`)}
            >
              <View style={globalStyles.listItemContent}>
                <Text style={globalStyles.listItemTitle}>{item.nome}</Text>
                <Text style={globalStyles.listItemSub}>Clique para registrar presença</Text>
              </View>
              <Text style={globalStyles.listItemBadge}>📝</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
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
        <Text style={globalStyles.configLabel}>Professor</Text>
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
      
      <Header title="Frequentar" subtitle={`Professor, ${userName}`} onLogout={handleLogout} />
      
      <TabBar tabs={tabs} activeTab={activeTab} onTabPress={setActiveTab} />
      
      <ScrollView style={globalStyles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'turmas' && renderTurmas()}
        {activeTab === 'presenca' && renderPresenca()}
        {activeTab === 'configuracoes' && renderConfiguracoes()}
      </ScrollView>
    </SafeAreaView>
  );
}
