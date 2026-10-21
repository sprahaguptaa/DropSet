import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const AVATAR_SIZE = 512;

// Pick a photo and return a 512px square JPEG ready to upload (null if the person cancels).
// Native shows its own square crop; web can't, so we center-crop here either way.
export async function pickAvatar(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;

  const { uri, width, height } = result.assets[0];
  const side = Math.min(width, height);
  const edit = ImageManipulator.manipulate(uri);
  if (width !== height) edit.crop({ originX: (width - side) / 2, originY: (height - side) / 2, width: side, height: side });
  edit.resize({ width: AVATAR_SIZE, height: AVATAR_SIZE });
  const image = await edit.renderAsync();
  const saved = await image.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
  return saved.uri;
}
