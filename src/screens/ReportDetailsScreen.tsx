import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../constants/colors';
import { Severity, Report } from '../types';
import Geolocation from '@react-native-community/geolocation';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { storageService } from '../services/storageService';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { GOOGLE_MAPS_API_KEY } from '@env';
import { apiService } from '../services/apiService';
import { authService } from '../services/authService';
import { aiService } from '../services/aiService';

const { width } = Dimensions.get('window');

type ReportDetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'ReportDetails'>;

const ReportDetailsScreen: React.FC<ReportDetailsScreenProps> = ({ route, navigation }) => {
  const { imageUri, location: passedLocation } = route.params;
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(!passedLocation);
  const [location, setLocation] = useState(passedLocation || { latitude: 0, longitude: 0 });
  const [address, setAddress] = useState(passedLocation ? 'Location captured from photo' : 'Fetching address...');
  
  // AI States
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [aiResult, setAiResult] = useState<{ className: string; probability: number } | null>(null);

  useEffect(() => {
    if (!passedLocation) {
      fetchRealLocation();
    }
    runAIClassification();
  }, [passedLocation]);

  const runAIClassification = async () => {
    setIsAnalyzing(true);
    try {
      const predictions = await aiService.classifyImage(imageUri);
      const result = aiService.isWaterlogged(predictions);
      setAiResult(result);
      
      // Auto-set severity if high confidence water detected
      if (result.probability > 0.8) {
        setSeverity('high');
        setDescription(`AI detected: ${result.className}`);
      }
    } catch (error) {
      console.error('AI Error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchRealLocation = async () => {
    setIsFetchingLocation(true);
    try {
      let permissionResult;
      if (Platform.OS === 'android') {
        permissionResult = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      } else {
        permissionResult = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      }

      if (permissionResult === RESULTS.GRANTED) {
        Geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setIsFetchingLocation(false);
          },
          (error) => {
            console.error('Location Error:', error);
            Alert.alert('Location Error', 'Unable to fetch real location. Using placeholder.');
            setLocation({ latitude: 28.6139, longitude: 77.2090 });
            setIsFetchingLocation(false);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      } else {
        Alert.alert('Permission Denied', 'Location permission is required to tag the report.');
        setLocation({ latitude: 28.6139, longitude: 77.2090 });
        setIsFetchingLocation(false);
      }
    } catch (error) {
      console.error('Permission Error:', error);
      setIsFetchingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Required', 'Please provide a short description.');
      return;
    }

    const authed = await authService.isAuthenticated();
    if (!authed) {
      Alert.alert('Login Required', 'You must be logged in to submit a report.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Submit to Backend API
      await apiService.createIssue(
        imageUri,
        location,
        aiResult?.className || 'waterlogged',
        aiResult?.probability || 1.0
      );

      // 2. Also save locally for offline access (optional/existing feature)
      const newReport: Report = {
        id: Date.now().toString(),
        userId: (await authService.getUser())?.id || 'unknown',
        imageUrl: imageUri,
        location: location,
        severity: severity,
        description: description,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await storageService.saveReport(newReport);

      setIsSubmitting(false);
      Alert.alert(
        'Success',
        'Report submitted successfully! Thank you for helping the community.',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    } catch (error: any) {
      setIsSubmitting(false);
      console.error('Submission Error:', error);
      Alert.alert('Error', error.message || 'Failed to submit report. Please try again.');
    }
  };

  const severityOptions: { key: Severity; label: string; color: string }[] = [
    { key: 'low', label: 'Low', color: COLORS.low },
    { key: 'medium', label: 'Medium', color: COLORS.medium },
    { key: 'high', label: 'High', color: COLORS.high },
    { key: 'critical', label: 'Critical', color: COLORS.critical },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Report Details</Text>

        <Image source={{ uri: imageUri }} style={styles.imagePreview} />

        <View style={styles.aiSection}>
          <Text style={styles.label}>AI Analysis</Text>
          {isAnalyzing ? (
            <View style={styles.analyzingBox}>
              <ActivityIndicator color={COLORS.primary} size="small" />
              <Text style={styles.analyzingText}>Analyzing image with MobileNet...</Text>
            </View>
          ) : (
            <View style={[styles.aiResultBox, { borderColor: (aiResult?.probability || 0) > 0.7 ? COLORS.high : COLORS.gray[300] }]}>
              <View style={styles.aiHeader}>
                <Text style={styles.aiResultTitle}>{aiResult?.className.toUpperCase() || 'UNKNOWN'}</Text>
                <Text style={styles.aiConfidence}>{( (aiResult?.probability || 0) * 100 ).toFixed(1)}% match</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${(aiResult?.probability || 0) * 100}%`, backgroundColor: (aiResult?.probability || 0) > 0.7 ? COLORS.high : COLORS.primary }]} />
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.searchBox}>
            <GooglePlacesAutocomplete
              placeholder={isFetchingLocation ? 'Detecting current location...' : 'Search for a location...'}
              onPress={(data, details = null) => {
                if (details) {
                  setLocation({
                    latitude: details.geometry.location.lat,
                    longitude: details.geometry.location.lng,
                  });
                  setAddress(data.description);
                }
              }}
              query={{
                key: GOOGLE_MAPS_API_KEY,
                language: 'en',
              }}
              fetchDetails={true}
              styles={{
                container: { flex: 0 },
                textInput: styles.searchInput,
                listView: { backgroundColor: '#fff', zIndex: 1000 },
              }}
            />
          </View>
          
          <View style={styles.locationInfo}>
            <Text style={styles.locationTextSmall}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
            {!isFetchingLocation && (
              <TouchableOpacity onPress={fetchRealLocation}>
                <Text style={styles.retryText}>Refresh GPS</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Severity Level</Text>
          <View style={styles.severityContainer}>
            {severityOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.severityButton,
                  { borderColor: option.color },
                  severity === option.key && { backgroundColor: option.color },
                ]}
                onPress={() => setSeverity(option.key)}
              >
                <Text
                  style={[
                    styles.severityText,
                    { color: option.color },
                    severity === option.key && { color: '#fff' },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.textInput}
            placeholder="E.g. Road blocked near Central Mall..."
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, (isSubmitting || isFetchingLocation) && styles.disabledButton]} 
          onPress={handleSubmit}
          disabled={isSubmitting || isFetchingLocation}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 20,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    marginBottom: 25,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[500],
    marginBottom: 10,
  },
  locationBox: {
    backgroundColor: COLORS.gray[200],
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  searchBox: {
    zIndex: 10,
    elevation: 3,
  },
  searchInput: {
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  locationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 5,
  },
  locationTextSmall: {
    fontSize: 12,
    color: COLORS.gray[500],
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fetchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  retryText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  severityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  severityButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 2,
  },
  severityText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: COLORS.gray[400],
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  aiSection: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: 'rgba(52, 152, 219, 0.05)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.1)',
  },
  analyzingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  analyzingText: {
    marginLeft: 10,
    color: COLORS.gray[500],
    fontSize: 14,
    fontStyle: 'italic',
  },
  aiResultBox: {
    padding: 12,
    backgroundColor:COLORS.surface,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 5,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiResultTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  aiConfidence: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});

export default ReportDetailsScreen;
