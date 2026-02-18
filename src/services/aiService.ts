import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
import * as jpeg from 'jpeg-js';

// Note: Using CPU backend and manual decoding to avoid all Expo/Native GL dependencies
class AIService {
  private model: mobilenet.MobileNet | null = null;
  private isInitialized: boolean = false;

  async init() {
    if (this.isInitialized) return;
    
    try {
      console.log('TFJS: Initializing CPU backend...');
      await tf.setBackend('cpu');
      await tf.ready();
      
      // Fix for "Cannot read property 'fetch' of undefined"
      // This happens because tfjs-react-native was removed, so we polyfill manually.
      try {
        // @ts-ignore
        if (!tf.env().platform || !tf.env().platform.fetch) {
          console.log('TFJS: Polyfilling platform fetch');
          // @ts-ignore
          tf.env().setPlatform('browser', {
            fetch: (...args: any[]) => fetch(...args),
            now: () => Date.now(),
            encode: (text: string, encoding: string) => Buffer.from(text, encoding as any),
            decode: (bytes: Uint8Array, encoding: string) => Buffer.from(bytes).toString(encoding as any),
          });
        }
      } catch (e) {
        console.warn('TFJS Platform Polyfill Warning:', e);
      }

      console.log('TFJS: Ready. Backend:', tf.getBackend());
      
      console.log('MobileNet: Loading model (this might take a moment on first run)...');
      this.model = await mobilenet.load();
      this.isInitialized = true;
      console.log('AI Service: Initialization complete');
    } catch (error) {
      console.error('AI Service: Initialization failed:', error);
      throw error;
    }
  }

  async classifyImage(imageUri: string) {
    if (!this.model) {
      await this.init();
    }
    
    if (!this.model) {
      throw new Error('AI Model could not be loaded');
    }

    try {
      console.log('Classifying image (CPU mode):', imageUri);
      
      const cleanUri = imageUri.startsWith('file://') ? imageUri.replace('file://', '') : imageUri;
      const imgB64 = await RNFS.readFile(cleanUri, 'base64');
      const rawImageData = Buffer.from(imgB64, 'base64');

      // 1. Decode JPEG manually using jpeg-js
      const { width, height, data } = jpeg.decode(rawImageData, { useTArray: true });
      
      // 2. Convert raw RGBA data to 3D RGB Tensor
      // MobileNet expects [1, 224, 224, 3] usually, but classify() handles resizing
      const buffer = new Float32Array(width * height * 3);
      for (let i = 0; i < width * height; i++) {
        buffer[i * 3 + 0] = data[i * 4 + 0]; // R
        buffer[i * 3 + 1] = data[i * 4 + 1]; // G
        buffer[i * 3 + 2] = data[i * 4 + 2]; // B
      }
      const imageTensor = tf.tensor3d(buffer, [height, width, 3]);

      // 3. Predict
      const predictions = await this.model.classify(imageTensor);
      console.log('Predictions:', predictions);
      
      // 4. Cleanup
      imageTensor.dispose();

      return predictions;
    } catch (error) {
      console.error('Classification error:', error);
      throw error;
    }
  }

  isWaterlogged(predictions: any[]): { className: string; probability: number } {
    // Keywords indicating waterlogging or related environments
    const waterKeywords = ['water', 'puddle', 'lake', 'pond', 'river', 'flood', 'stream', 'rain', 'canal'];
    
    // Find matching keyword in predictions
    const matched = predictions.find(p => 
      waterKeywords.some(keyword => p.className.toLowerCase().includes(keyword))
    );

    if (matched) {
      return { className: matched.className, probability: matched.probability };
    }
    
    return { 
      className: predictions[0]?.className || 'unknown', 
      probability: predictions[0]?.probability || 0 
    };
  }
}

export const aiService = new AIService();
