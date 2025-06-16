import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Platform, Alert } from 'react-native';
import { APP_CONFIG, ERROR_MESSAGES } from '../constants';

// Image handling utilities for camera and gallery
export class ImageHandler {
  /**
   * Request necessary permissions for camera and media library
   * @returns {Promise<{camera: boolean, mediaLibrary: boolean}>}
   */
  static async requestPermissions() {
    try {
      const permissions = {
        camera: false,
        mediaLibrary: false,
      };

      // Request camera permissions
      if (Platform.OS !== 'web') {
        const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
        permissions.camera = cameraResult.status === 'granted';

        const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        permissions.mediaLibrary = mediaResult.status === 'granted';
      } else {
        // Web platform - permissions are handled by browser
        permissions.camera = true;
        permissions.mediaLibrary = true;
      }

      return permissions;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return { camera: false, mediaLibrary: false };
    }
  }

  /**
   * Show image picker options (camera or gallery)
   * @param {function} onImageSelected - Callback when image is selected
   * @param {object} options - Additional options
   */
  static showImagePickerOptions(onImageSelected, options = {}) {
    const { title = 'Wybierz zródło zdjęcia', message = 'Skąd chcesz dodać zdjęcie okładki?' } = options;

    Alert.alert(
      title,
      message,
      [
        { text: 'Anuluj', style: 'cancel' },
        { 
          text: 'Galeria', 
          onPress: () => this.pickImageFromGallery(onImageSelected, options) 
        },
        { 
          text: 'Aparat', 
          onPress: () => this.takePhotoWithCamera(onImageSelected, options) 
        },
      ]
    );
  }

  /**
   * Pick image from gallery
   * @param {function} onImageSelected - Callback when image is selected
   * @param {object} options - Image picker options
   */
  static async pickImageFromGallery(onImageSelected, options = {}) {
    try {
      const permissions = await this.requestPermissions();
      
      if (!permissions.mediaLibrary) {
        Alert.alert(
          'Brak uprawnień', 
          'Potrzebujemy uprawnień do galerii, aby dodać zdjęcie okładki.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: options.aspect || APP_CONFIG.ASPECT_RATIO,
        quality: options.quality || APP_CONFIG.IMAGE_QUALITY,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        const processedImage = await this.processImage(selectedImage, options);
        onImageSelected(processedImage);
      }
    } catch (error) {
      console.error('Error picking image from gallery:', error);
      Alert.alert('Błąd', 'Nie udało się wybrać zdjęcia z galerii.');
    }
  }

  /**
   * Take photo with camera
   * @param {function} onImageSelected - Callback when photo is taken
   * @param {object} options - Camera options
   */
  static async takePhotoWithCamera(onImageSelected, options = {}) {
    try {
      const permissions = await this.requestPermissions();
      
      if (!permissions.camera) {
        Alert.alert(
          'Brak uprawnień', 
          'Potrzebujemy uprawnień do kamery, aby zrobić zdjęcie okładki.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: options.aspect || APP_CONFIG.ASPECT_RATIO,
        quality: options.quality || APP_CONFIG.IMAGE_QUALITY,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        const processedImage = await this.processImage(selectedImage, options);
        onImageSelected(processedImage);
      }
    } catch (error) {
      console.error('Error taking photo with camera:', error);
      Alert.alert('Błąd', 'Nie udało się zrobić zdjęcia aparatem.');
    }
  }

  /**
   * Process and optimize image
   * @param {object} imageAsset - Image asset from ImagePicker
   * @param {object} options - Processing options
   * @returns {Promise<object>} Processed image info
   */
  static async processImage(imageAsset, options = {}) {
    try {
      const { 
        maxWidth = 800, 
        maxHeight = 1200, 
        compress = true,
        saveToCache = true 
      } = options;

      let processedUri = imageAsset.uri;

      // Resize image if it's too large
      if (imageAsset.width > maxWidth || imageAsset.height > maxHeight) {
        const manipulatorResult = await ImagePicker.manipulateAsync(
          imageAsset.uri,
          [
            {
              resize: {
                width: Math.min(imageAsset.width, maxWidth),
                height: Math.min(imageAsset.height, maxHeight),
              },
            },
          ],
          {
            compress: compress ? 0.8 : 1,
            format: ImagePicker.SaveFormat.JPEG,
          }
        );
        processedUri = manipulatorResult.uri;
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(processedUri);

      // Save to app's cache directory if requested
      if (saveToCache && Platform.OS !== 'web') {
        const fileName = `book_cover_${Date.now()}.jpg`;
        const cachedUri = `${FileSystem.cacheDirectory}${fileName}`;
        
        await FileSystem.copyAsync({
          from: processedUri,
          to: cachedUri,
        });
        
        processedUri = cachedUri;
      }

      return {
        uri: processedUri,
        width: imageAsset.width,
        height: imageAsset.height,
        size: fileInfo.size,
        type: 'image/jpeg',
        fileName: `book_cover_${Date.now()}.jpg`,
      };

    } catch (error) {
      console.error('Error processing image:', error);
      // Return original image if processing fails
      return {
        uri: imageAsset.uri,
        width: imageAsset.width,
        height: imageAsset.height,
        type: 'image/jpeg',
        fileName: `book_cover_${Date.now()}.jpg`,
      };
    }
  }

  /**
   * Clear cached images older than specified days
   * @param {number} daysOld - Days old threshold
   */
  static async clearOldCachedImages(daysOld = 30) {
    try {
      if (Platform.OS === 'web') return;

      const cacheDir = FileSystem.cacheDirectory;
      const files = await FileSystem.readDirectoryAsync(cacheDir);
      
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      
      for (const file of files) {
        if (file.startsWith('book_cover_')) {
          const filePath = `${cacheDir}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          
          if (fileInfo.exists && fileInfo.modificationTime < cutoffTime) {
            await FileSystem.deleteAsync(filePath);
          }
        }
      }
    } catch (error) {
      console.warn('Error clearing cached images:', error);
    }
  }

  /**
   * Get cached images info
   * @returns {Promise<object>} Cache statistics
   */
  static async getCacheInfo() {
    try {
      if (Platform.OS === 'web') {
        return { totalFiles: 0, totalSize: 0, files: [] };
      }

      const cacheDir = FileSystem.cacheDirectory;
      const files = await FileSystem.readDirectoryAsync(cacheDir);
      
      const bookCoverFiles = files.filter(file => file.startsWith('book_cover_'));
      let totalSize = 0;
      const fileDetails = [];

      for (const file of bookCoverFiles) {
        const filePath = `${cacheDir}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists) {
          totalSize += fileInfo.size;
          fileDetails.push({
            name: file,
            size: fileInfo.size,
            modificationTime: fileInfo.modificationTime,
          });
        }
      }

      return {
        totalFiles: bookCoverFiles.length,
        totalSize,
        files: fileDetails.sort((a, b) => b.modificationTime - a.modificationTime),
      };

    } catch (error) {
      console.error('Error getting cache info:', error);
      return { totalFiles: 0, totalSize: 0, files: [] };
    }
  }

  /**
   * Validate image file
   * @param {string} uri - Image URI
   * @returns {Promise<boolean>} Is valid image
   */
  static async validateImage(uri) {
    try {
      if (!uri) return false;

      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      if (!fileInfo.exists) return false;

      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (fileInfo.size > maxSize) return false;

      return true;
    } catch (error) {
      console.error('Error validating image:', error);
      return false;
    }
  }
}

// Legacy functions for backward compatibility
export const pickImage = (setFieldValue) => {
  ImageHandler.showImagePickerOptions((image) => {
    setFieldValue('coverImage', image.uri);
  });
};

export const takePhoto = (setFieldValue) => {
  ImageHandler.takePhotoWithCamera((image) => {
    setFieldValue('coverImage', image.uri);
  });
};