import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { globalStyles } from '../styles/globalStyles';

export default function TabBar({ tabs, activeTab, onTabPress }) {
  return (
    <View style={globalStyles.tabBar}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[globalStyles.tab, activeTab === tab.key && globalStyles.activeTab]}
          onPress={() => onTabPress(tab.key)}
        >
          <Text style={[globalStyles.tabText, activeTab === tab.key && globalStyles.activeTabText]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
