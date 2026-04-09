import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Telas
import LoginScreen from './src/screens/LoginScreen';
import AdminScreen from './src/screens/AdminScreen';
import ProfessorScreen from './src/screens/ProfessorScreen';
import AlunoScreen from './src/screens/AlunoScreen';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const usuario = await AsyncStorage.getItem('usuario');
      
      if (token && usuario) {
        const user = JSON.parse(usuario);
        if (user.perfil === 'admin') setInitialRoute('Admin');
        else if (user.perfil === 'professor') setInitialRoute('Professor');
        else if (user.perfil === 'aluno') setInitialRoute('Aluno');
      }
    } catch (error) {
      console.error('Erro ao verificar login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="Professor" component={ProfessorScreen} />
        <Stack.Screen name="Aluno" component={AlunoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
