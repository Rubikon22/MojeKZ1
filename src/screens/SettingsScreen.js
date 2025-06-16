import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { List, Switch, Button, Divider, Text, Dialog, Portal, Paragraph } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBookActions } from '../context/OptimizedBookContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const SettingsScreen = () => {
  const { clearAllBooks } = useBookActions();
  const { user, signOut } = useAuth();
  const { isDarkMode, toggleTheme, theme } = useTheme();
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        Alert.alert('Blad', 'Nie udalo sie wylogowac: ' + error);
      }
    } catch (error) {
      Alert.alert('Blad', 'Wystapil blad podczas wylogowywania');
    }
  };


  const clearAllData = async () => {
    try {
      // Clear all books using BookContext
      await clearAllBooks();
      
      // Clear remaining AsyncStorage data (theme, etc.)
      await AsyncStorage.clear();
      
      Alert.alert('Dane wyczyszczone', 'Wszystkie dane zostaly usuniete.');
    } catch (error) {
      console.error('Error clearing data:', error);
      Alert.alert('Blad', 'Nie udalo sie wyczyscic wszystkich danych.');
    }
  };

  const styles = createStyles(theme);

  return (
    <ScrollView style={styles.container}>
      {user && (
        <>
          <List.Section>
            <List.Subheader>Konto</List.Subheader>
            <List.Item
              title="Email"
              description={user.email}
              left={props => <List.Icon {...props} icon="account" />}
            />
            <List.Item
              title="Wyloguj sie"
              description="Wyloguj sie z aplikacji"
              left={props => <List.Icon {...props} icon="logout" />}
              onPress={() => setLogoutDialogVisible(true)}
            />
          </List.Section>
          
          <Divider />
        </>
      )}
      
      <List.Section>
        <List.Subheader>Wyglad</List.Subheader>
        <List.Item
          title="Ciemny motyw"
          left={props => <List.Icon {...props} icon="brightness-6" />}
          right={props => <Switch value={isDarkMode} onValueChange={toggleTheme} />}
        />
      </List.Section>
      
      <Divider />
      
      
      <List.Section>
        <List.Subheader>Niebezpieczna strefa</List.Subheader>
        <List.Item
          title="Wyczysc wszystkie dane"
          description="Usun wszystkie ksiazki i ustawienia"
          left={props => <List.Icon {...props} icon="delete-forever" color="#f44336" />}
          onPress={() => setConfirmDialogVisible(true)}
        />
      </List.Section>
      
      <View style={styles.infoContainer}>
        <Text style={styles.versionText}>Wersja aplikacji: 1.0.0</Text>
        <Text style={styles.copyrightText}>© 2023 Moja Biblioteczka</Text>
        {user && (
          <Text style={styles.statusText}>
            Status: Zalogowany {user ? '(Polaczony)' : '(Rozlaczony)'}
          </Text>
        )}
      </View>
      
      <Portal>
        <Dialog visible={confirmDialogVisible} onDismiss={() => setConfirmDialogVisible(false)}>
          <Dialog.Title>Potwierdz usuniecie</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Czy na pewno chcesz usunac wszystkie dane? Ta operacja jest nieodwracalna.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDialogVisible(false)}>Anuluj</Button>
            <Button 
              onPress={() => {
                setConfirmDialogVisible(false);
                clearAllData();
              }} 
              textColor="#f44336"
            >
              Usun
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog visible={logoutDialogVisible} onDismiss={() => setLogoutDialogVisible(false)}>
          <Dialog.Title>Wyloguj sie</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Czy na pewno chcesz sie wylogowac?
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutDialogVisible(false)}>Anuluj</Button>
            <Button 
              onPress={() => {
                setLogoutDialogVisible(false);
                handleSignOut();
              }}
            >
              Wyloguj
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  infoContainer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  versionText: {
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  copyrightText: {
    color: theme.colors.textTertiary,
    fontSize: 12,
  },
  statusText: {
    color: theme.colors.success,
    fontSize: 12,
    marginTop: 5,
  },
});

export default SettingsScreen;