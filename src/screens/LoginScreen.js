import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { getDeviceId } from '../utils/wifi';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [perfil, setPerfil] = useState('aluno');
  const [loading, setLoading] = useState(false);

  // Limpar qualquer token existente ao iniciar a tela de login
  useEffect(() => {
    const limparTokens = async () => {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      console.log('✅ Tokens limpos - usuário não autenticado');
    };
    limparTokens();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const deviceId = await getDeviceId();
      const response = await api.login(email, password, perfil, deviceId);
      
      if (response.token) {
        await AsyncStorage.setItem('token', response.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.usuario));
        
        if (perfil === 'admin') {
          navigation.replace('Admin');
        } else if (perfil === 'professor') {
          navigation.replace('Professor');
        } else {
          navigation.replace('Aluno');
        }
      }
    } catch (error) {
      Alert.alert('Erro', error.message || 'Falha no login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Frequentar</Text>
          <Text style={styles.subtitle}>Sistema de Presença por Wi-Fi</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View style={styles.perfilContainer}>
            <TouchableOpacity
              style={[styles.perfilButton, perfil === 'aluno' && styles.perfilActive]}
              onPress={() => setPerfil('aluno')}
            >
              <Text style={[styles.perfilText, perfil === 'aluno' && styles.perfilTextActive]}>Aluno</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.perfilButton, perfil === 'professor' && styles.perfilActive]}
              onPress={() => setPerfil('professor')}
            >
              <Text style={[styles.perfilText, perfil === 'professor' && styles.perfilTextActive]}>Professor</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.perfilButton, perfil === 'admin' && styles.perfilActive]}
              onPress={() => setPerfil('admin')}
            >
              <Text style={[styles.perfilText, perfil === 'admin' && styles.perfilTextActive]}>Admin</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.demoContainer}>
          <Text style={styles.demoTitle}>Demo - Credenciais de Teste</Text>
          <Text style={styles.demoText}>Admin: admin@escola.com / admin123</Text>
          <Text style={styles.demoText}>Professor: professor@escola.com / prof123</Text>
          <Text style={styles.demoText}>Aluno: aluno@escola.com / aluno123</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a2b4e',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  perfilContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  perfilButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
  },
  perfilActive: {
    backgroundColor: '#0a2b4e',
  },
  perfilText: {
    color: '#666',
    fontWeight: '500',
  },
  perfilTextActive: {
    color: '#fff',
  },
  loginButton: {
    backgroundColor: '#0a2b4e',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  demoContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  demoTitle: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  demoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginBottom: 4,
  },
});
