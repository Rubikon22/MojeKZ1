import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useBookState, useBookActions } from '../context/OptimizedBookContext';
import { useNetworkStatus } from '../utils/networkStatus';
import { OfflineManager } from '../utils/offlineManager';

const OfflineIndicator = ({ style }) => {
  const [syncMessage, setSyncMessage] = useState('');
  
  const { isOffline, queuedOperations } = useBookState();
  const { forceSync } = useBookActions();
  
  const { connectionQuality, connectionType } = useNetworkStatus();

  useEffect(() => {
    const unsubscribe = OfflineManager.addListener((event, data) => {
      if (event === 'sync_skipped' && data?.reason === 'no_auth') {
        setSyncMessage('Требуется авторизация для синхронизации');
        setTimeout(() => setSyncMessage(''), 5000); // Clear message after 5 seconds
      }
    });

    return unsubscribe;
  }, []);

  const handleSyncPress = async () => {
    try {
      await forceSync();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  if (!isOffline && queuedOperations === 0) {
    return null;
  }

  const getStatusColor = () => {
    if (isOffline) return '#ff6b6b';
    if (queuedOperations > 0) return '#ffd93d';
    return '#51cf66';
  };

  const getStatusText = () => {
    if (syncMessage) {
      return syncMessage;
    }
    if (isOffline) {
      return `Tryb offline (${queuedOperations} operacji w kolejce)`;
    }
    if (queuedOperations > 0) {
      return `Oczekuje synchronizacji (${queuedOperations} operacji)`;
    }
    return 'Online';
  };

  const getConnectionInfo = () => {
    if (!isOffline) {
      return `${connectionType} - ${connectionQuality}`;
    }
    return 'Brak połączenia';
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: getStatusColor() }, style]}
      onPress={queuedOperations > 0 ? handleSyncPress : undefined}
      disabled={isOffline}
    >
      <View style={styles.content}>
        <Text style={styles.statusText}>
          {getStatusText()}
        </Text>
        <Text style={styles.connectionText}>
          {getConnectionInfo()}
        </Text>
      </View>
      
      {queuedOperations > 0 && !isOffline && (
        <View style={styles.syncButton}>
          <Text style={styles.syncText}>SYNC</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  content: {
    flex: 1,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  connectionText: {
    color: '#fff',
    fontSize: 10,
    opacity: 0.9,
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  syncText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 10,
  },
});

export default OfflineIndicator;