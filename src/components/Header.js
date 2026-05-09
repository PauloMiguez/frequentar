import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { globalStyles } from '../styles/globalStyles';

export default function Header({ title, subtitle, onLogout, showLogout = true }) {
  return (
    <View style={globalStyles.header}>
      <View>
        <Text style={globalStyles.headerTitle}>{title}</Text>
        {subtitle && <Text style={globalStyles.headerSubtitle}>{subtitle}</Text>}
      </View>
      {showLogout && (
        <TouchableOpacity onPress={onLogout} style={globalStyles.logoutIcon}>
          <Text style={globalStyles.logoutIconText}>🚪</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
