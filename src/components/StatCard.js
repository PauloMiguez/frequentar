import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { globalStyles } from '../styles/globalStyles';

export default function StatCard({ value, label, onPress, color }) {
  const CardComponent = onPress ? TouchableOpacity : View;
  
  return (
    <CardComponent style={globalStyles.statCard} onPress={onPress}>
      <Text style={[globalStyles.statValue, color && { color }]}>{value}</Text>
      <Text style={globalStyles.statLabel}>{label}</Text>
    </CardComponent>
  );
}
