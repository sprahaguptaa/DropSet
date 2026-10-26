import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { color, radius, space } from '@/theme/tokens';

import { Button } from './Button';
import { T } from './Text';

// Camera viewfinder that reports the first QR code it sees. Works in Expo Go and in browsers with a camera.
export function QrScanner({ onScan }: { onScan: (value: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return (
      <View style={[styles.box, styles.center]}>
        <ActivityIndicator color={color.onDark} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.box, styles.center]}>
        <T v="callout" c="onDark" style={styles.text}>
          {permission.canAskAgain ? 'Allow the camera to scan pass QR codes.' : 'Camera access is off. Type the code instead.'}
        </T>
        {permission.canAskAgain && <Button label="Allow camera" variant="light" size="s" onPress={requestPermission} />}
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={
          scanned
            ? undefined
            : ({ data }) => {
                setScanned(true);
                onScan(data);
              }
        }
      />
      <View style={styles.frame} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: 280, borderRadius: radius.l, overflow: 'hidden', backgroundColor: color.ink },
  center: { alignItems: 'center', justifyContent: 'center', gap: space.m, padding: space.xl },
  text: { textAlign: 'center' },
  frame: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 180,
    height: 180,
    marginTop: -90,
    marginLeft: -90,
    borderRadius: radius.l,
    borderWidth: 3,
    borderColor: color.onDark,
  },
});
