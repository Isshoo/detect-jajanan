import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  Alert,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "react-native";

const { width, height } = Dimensions.get("window");

interface PredictionResult {
  class: string;
  confidence: number;
  probabilities: Record<string, number>;
  error?: string;
}

interface ClassInfo {
  name: string;
  displayName: string;
  description: string;
  color: string;
}

const classInfoMap: Record<string, ClassInfo> = {
  dadarGulung: {
    name: "dadarGulung",
    displayName: "Dadar Gulung",
    description: "Kue tradisional berbentuk gulungan dengan isi kelapa",
    color: "#4CAF50",
  },
  kueLapis: {
    name: "kueLapis",
    displayName: "Kue Lapis",
    description: "Kue berlapis-lapis dengan warna-warni yang menarik",
    color: "#FF9800",
  },
  risol: {
    name: "risol",
    displayName: "Risol",
    description: "Makanan ringan berisi sayuran yang dibalut kulit lumpia",
    color: "#2196F3",
  },
};

export default function Home() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    requestPermission();
  }, []);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color="#fff" />
          <Text style={styles.permissionText}>Aplikasi memerlukan akses kamera</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Izinkan Kamera</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        if (photo?.uri) {
          setCapturedImage(photo.uri);
          setShowCamera(false);
          setResult(null);
        }
      } catch (error) {
        Alert.alert("Error", "Gagal mengambil foto");
      }
    }
  };

  const pickImageFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setCapturedImage(result.assets[0].uri);
      setShowCamera(false);
      setResult(null);
    }
  };

  const uploadImage = async () => {
    if (!capturedImage) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", {
      uri: capturedImage,
      name: "photo.jpg",
      type: "image/jpeg",
    } as any);

    try {
      const response = await axios.post("http://192.168.1.4:5000/predict", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 10000,
      });
      setResult(response.data);
      setShowResult(true);
    } catch (error) {
      setResult({
        class: "",
        confidence: 0,
        probabilities: {},
        error: "Gagal melakukan prediksi. Periksa koneksi internet.",
      });
      setShowResult(true);
    }
    setLoading(false);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setResult(null);
    setShowCamera(true);
    setShowResult(false);
  };

  const renderCameraView = () => (
    <View style={styles.cameraContainer}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef} />

      {/* Overlay components positioned absolutely */}
      <View style={styles.cameraOverlay}>
        <View style={styles.topBar}>
          <Text style={styles.title}>Deteksi Jajanan Manado</Text>
        </View>

        <View style={styles.centerFrame}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanText}>Arahkan kamera ke jajanan</Text>
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.galleryButton} onPress={pickImageFromGallery}>
            <Ionicons name="images-outline" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
            <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderPreviewView = () => (
    <View style={styles.previewContainer}>
      <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.previewHeader}>
        <Text style={styles.previewTitle}>Preview Gambar</Text>
      </LinearGradient>

      <View style={styles.imageContainer}>
        <View style={styles.imageWrapper}>
          {capturedImage && <Image source={{ uri: capturedImage }} style={styles.previewImage} resizeMode="cover" />}
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
          <Ionicons name="camera-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Foto Ulang</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.analyzeButton, loading && styles.disabledButton]}
          onPress={uploadImage}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="scan-outline" size={20} color="#fff" />
          )}
          <Text style={styles.buttonText}>{loading ? "Menganalisis..." : "Analisis"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderResultModal = () => (
    <Modal animationType="slide" transparent={true} visible={showResult} onRequestClose={() => setShowResult(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={result?.error ? ["#f44336", "#d32f2f"] : ["#4CAF50", "#388E3C"]}
            style={styles.modalHeader}
          >
            <Ionicons
              name={result?.error ? "close-circle-outline" : "checkmark-circle-outline"}
              size={40}
              color="#fff"
            />
            <Text style={styles.modalTitle}>{result?.error ? "Error" : "Hasil Deteksi"}</Text>
          </LinearGradient>

          <ScrollView style={styles.modalContent}>
            {result?.error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{result.error}</Text>
              </View>
            ) : (
              <View style={styles.resultContainer}>
                <View style={styles.mainResult}>
                  <Text style={styles.resultLabel}>Jenis Jajanan:</Text>
                  <Text style={[styles.resultValue, { color: classInfoMap[result?.class || ""]?.color || "#333" }]}>
                    {classInfoMap[result?.class || ""]?.displayName || result?.class}
                  </Text>
                  <Text style={styles.description}>{classInfoMap[result?.class || ""]?.description || ""}</Text>
                </View>

                <View style={styles.confidenceContainer}>
                  <Text style={styles.confidenceLabel}>Tingkat Kepercayaan:</Text>
                  <View style={styles.confidenceBar}>
                    <View
                      style={[
                        styles.confidenceFill,
                        {
                          width: `${(result?.confidence || 0) * 100}%`,
                          backgroundColor: classInfoMap[result?.class || ""]?.color || "#4CAF50",
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.confidenceText}>{((result?.confidence || 0) * 100).toFixed(1)}%</Text>
                </View>

                <View style={styles.probabilitiesContainer}>
                  <Text style={styles.probabilitiesTitle}>Detail Probabilitas:</Text>
                  {Object.entries(result?.probabilities || {}).map(([key, value]) => (
                    <View key={key} style={styles.probabilityItem}>
                      <Text style={styles.probabilityLabel}>{classInfoMap[key]?.displayName || key}</Text>
                      <View style={styles.probabilityBar}>
                        <View
                          style={[
                            styles.probabilityFill,
                            {
                              width: `${(value as number) * 100}%`,
                              backgroundColor: classInfoMap[key]?.color || "#ccc",
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.probabilityValue}>{((value as number) * 100).toFixed(1)}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowResult(false)}>
              <Text style={styles.closeButtonText}>Tutup</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.newPhotoButton}
              onPress={() => {
                setShowResult(false);
                retakePhoto();
              }}
            >
              <Text style={styles.newPhotoButtonText}>Foto Baru</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      {showCamera ? renderCameraView() : renderPreviewView()}
      {renderResultModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    marginVertical: 20,
  },
  permissionButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#667eea",
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  topBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  centerFrame: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: "#fff",
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  scanText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 20,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 40,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ff4757",
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  previewHeader: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  imageWrapper: {
    width: width - 40,
    height: width - 40,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6c757d",
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    gap: 8,
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#28a745",
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: "#6c757d",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: width - 40,
    maxHeight: height * 0.8,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 10,
  },
  modalContent: {
    maxHeight: height * 0.5,
  },
  errorContainer: {
    padding: 20,
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#d32f2f",
    textAlign: "center",
  },
  resultContainer: {
    padding: 20,
  },
  mainResult: {
    alignItems: "center",
    marginBottom: 20,
  },
  resultLabel: {
    fontSize: 16,
    color: "#666",
    marginBottom: 5,
  },
  resultValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    fontStyle: "italic",
  },
  confidenceContainer: {
    marginBottom: 20,
  },
  confidenceLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  confidenceBar: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginBottom: 5,
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
  },
  probabilitiesContainer: {
    marginBottom: 10,
  },
  probabilitiesTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },
  probabilityItem: {
    marginBottom: 12,
  },
  probabilityLabel: {
    fontSize: 14,
    marginBottom: 5,
    color: "#555",
  },
  probabilityBar: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    marginBottom: 2,
  },
  probabilityFill: {
    height: "100%",
    borderRadius: 3,
  },
  probabilityValue: {
    fontSize: 12,
    textAlign: "right",
    color: "#666",
  },
  modalButtons: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  closeButton: {
    flex: 1,
    paddingVertical: 18,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  closeButtonText: {
    fontSize: 16,
    color: "#666",
  },
  newPhotoButton: {
    flex: 1,
    paddingVertical: 18,
    alignItems: "center",
  },
  newPhotoButtonText: {
    fontSize: 16,
    color: "#667eea",
    fontWeight: "600",
  },
});
